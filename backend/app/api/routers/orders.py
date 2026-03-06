import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_current_user_optional, get_db
from app.models.catalog import Pizza, Topping
from app.models.order import Order, OrderItem, OrderItemTopping
from app.models.user import User
from app.schemas.order import CreateOrderIn, OrderItemOut, OrderListItemOut, OrderOut
from app.services.pricing import (
    calc_delivery,
    calc_discount_for_item,
    calc_unit_price,
    make_public_token,
)

router = APIRouter(tags=["orders"])


def parse_order_uuid(order_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid order_id format") from exc


def serialize_order(order: Order, topping_map: dict[str, str]) -> OrderOut:
    items_out: list[OrderItemOut] = []
    for it in order.items:
        top_ids = [t.topping_id for t in it.toppings]
        top_names = [topping_map.get(tid, tid) for tid in top_ids]
        items_out.append(
            OrderItemOut(
                pizza_id=it.pizza_id,
                size_id=it.size_id,
                qty=it.qty,
                unit_price=it.unit_price,
                title=it.title,
                toppings=top_names,
            )
        )
    return OrderOut(
        order_id=order.id,
        public_token=order.public_token,
        status=order.status,
        subtotal=order.subtotal,
        discount=order.discount,
        delivery_price=order.delivery_price,
        total=order.total,
        created_at=order.created_at.isoformat(),
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        delivery_address=order.delivery_address,
        delivery_comment=order.delivery_comment,
        payment_method=order.payment_method,
        items=items_out,
    )


@router.post("/orders", response_model=OrderOut)
async def create_order(
    data: CreateOrderIn,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    topping_map = {t.id: t.name for t in (await db.execute(select(Topping))).scalars().all()}

    subtotal_before_discount = 0
    discount = 0
    items_models: list[OrderItem] = []

    for item in data.items:
        pizza = (
            await db.execute(select(Pizza).where(Pizza.id == item.pizza_id, Pizza.available.is_(True)))
        ).scalar_one_or_none()
        if not pizza:
            raise HTTPException(status_code=409, detail=f"pizza not available: {item.pizza_id}")

        try:
            unit = await calc_unit_price(db, item.pizza_id, item.size_id, item.toppings)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        subtotal_before_discount += unit * item.qty
        discount += calc_discount_for_item(item.pizza_id, item.toppings, unit, item.qty)

        order_item = OrderItem(
            pizza_id=item.pizza_id,
            size_id=item.size_id,
            qty=item.qty,
            unit_price=unit,
            title=pizza.name,
        )
        for tid in item.toppings:
            order_item.toppings.append(OrderItemTopping(topping_id=tid))
        items_models.append(order_item)

    subtotal = max(0, subtotal_before_discount - discount)
    delivery_price = calc_delivery(subtotal, has_items=len(items_models) > 0)
    total = subtotal + delivery_price

    order = Order(
        user_id=user.id if user else None,
        public_token=make_public_token(),
        status="created",
        customer_name=data.customer.name,
        customer_phone=data.customer.phone,
        delivery_address=data.delivery.address,
        delivery_comment=data.delivery.comment,
        payment_method=data.payment_method,
        subtotal=subtotal,
        discount=discount,
        delivery_price=delivery_price,
        total=total,
    )
    order.items = items_models

    db.add(order)
    await db.commit()

    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items).selectinload(OrderItem.toppings))
        )
    ).scalar_one()

    return serialize_order(order, topping_map)


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    public_token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    topping_map = {t.id: t.name for t in (await db.execute(select(Topping))).scalars().all()}
    order_uuid = parse_order_uuid(order_id)

    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order_uuid)
            .options(selectinload(Order.items).selectinload(OrderItem.toppings))
        )
    ).scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user and (order.user_id == user.id or user.role == "admin"):
        return serialize_order(order, topping_map)

    if public_token and public_token == order.public_token:
        return serialize_order(order, topping_map)

    raise HTTPException(status_code=401, detail="Not allowed (need JWT or public_token)")


@router.get("/me/orders", response_model=list[OrderListItemOut])
async def my_orders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .options(selectinload(Order.items))
        .order_by(desc(Order.created_at))
    )
    orders = res.scalars().all()
    return [
        OrderListItemOut(
            order_id=o.id,
            status=o.status,
            total=o.total,
            created_at=o.created_at.isoformat(),
            items_count=len(o.items),
        )
        for o in orders
    ]


@router.get("/me/orders/{order_id}", response_model=OrderOut)
async def my_order_details(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order_uuid = parse_order_uuid(order_id)
    topping_map = {t.id: t.name for t in (await db.execute(select(Topping))).scalars().all()}
    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order_uuid, Order.user_id == user.id)
            .options(selectinload(Order.items).selectinload(OrderItem.toppings))
        )
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(order, topping_map)
