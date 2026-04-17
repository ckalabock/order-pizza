import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_current_user_optional, get_db
from app.models.catalog import Topping
from app.models.order import Order, OrderItem, Review
from app.models.user import User
from app.schemas.order import (
    AdminReviewOut,
    CreateOrderIn,
    OrderListItemOut,
    OrderOut,
    OrderPreviewIn,
    OrderPreviewOut,
    OrderReviewIn,
    OrderReviewOut,
    OrderItemOut,
)
from app.services.order_flow import PreparedOrder, prepare_order
from app.services.pricing import make_public_token

router = APIRouter(tags=["orders"])


def parse_order_uuid(order_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid order_id format") from exc


def raise_order_error(exc: ValueError) -> None:
    detail = str(exc)
    if detail.startswith("pizza not available"):
        raise HTTPException(status_code=409, detail=detail) from exc
    raise HTTPException(status_code=400, detail=detail) from exc


def serialize_review(review: Review | None) -> OrderReviewOut | None:
    if not review:
        return None
    return OrderReviewOut(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at.isoformat(),
    )


def serialize_order(order: Order, topping_map: dict[str, str]) -> OrderOut:
    items_out: list[OrderItemOut] = []
    for item in order.items:
        topping_names = []
        for rel in item.toppings:
            topping_title = topping_map.get(rel.topping_id, rel.topping_id)
            topping_names.append(
                f"{topping_title} x{rel.qty}" if rel.qty > 1 else topping_title
            )
        items_out.append(
            OrderItemOut(
                pizza_id=item.pizza_id,
                size_id=item.size_id,
                qty=item.qty,
                unit_price=item.unit_price,
                title=item.title,
                toppings=topping_names,
            )
        )

    combo_discount = max(order.discount - order.promo_discount, 0)
    return OrderOut(
        order_id=order.id,
        public_token=order.public_token,
        status=order.status,
        subtotal_before_discount=order.subtotal + order.discount,
        combo_discount=combo_discount,
        subtotal=order.subtotal,
        discount=order.discount,
        promo_code=order.promo_code,
        promo_discount=order.promo_discount,
        bonus_spent=order.bonus_spent,
        delivery_price=order.delivery_price,
        total=order.total,
        created_at=order.created_at.isoformat(),
        scheduled_for=order.scheduled_for.isoformat() if order.scheduled_for else None,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        delivery_address=order.delivery_address,
        delivery_comment=order.delivery_comment,
        payment_method=order.payment_method,
        items=items_out,
        review=serialize_review(order.review),
    )


def serialize_preview(prepared: PreparedOrder) -> OrderPreviewOut:
    return OrderPreviewOut(
        subtotal_before_discount=prepared.subtotal_before_discount,
        combo_discount=prepared.combo_discount,
        subtotal=prepared.subtotal,
        discount=prepared.discount,
        promo_code=prepared.promo.code if prepared.promo else None,
        promo_discount=prepared.promo_discount,
        delivery_price=prepared.delivery_price,
        bonus_spent=prepared.bonus_spent,
        total_before_bonuses=prepared.total_before_bonuses,
        total=prepared.total,
        scheduled_for=prepared.scheduled_for.isoformat() if prepared.scheduled_for else None,
    )


async def get_topping_map(db: AsyncSession) -> dict[str, str]:
    return {t.id: t.name for t in (await db.execute(select(Topping))).scalars().all()}


@router.post("/orders/preview", response_model=OrderPreviewOut)
async def preview_order(
    data: OrderPreviewIn,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    try:
        prepared = await prepare_order(db, data, user)
    except ValueError as exc:
        raise_order_error(exc)
    return serialize_preview(prepared)


@router.post("/orders", response_model=OrderOut)
async def create_order(
    data: CreateOrderIn,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    try:
        prepared = await prepare_order(
            db,
            OrderPreviewIn(
                items=data.items,
                bonus_spent=data.bonus_spent,
                promo_code=data.promo_code,
                scheduled_for=data.scheduled_for,
            ),
            user,
        )
    except ValueError as exc:
        raise_order_error(exc)

    order = Order(
        user_id=user.id if user else None,
        public_token=make_public_token(),
        status="created",
        customer_name=data.customer.name,
        customer_phone=data.customer.phone,
        delivery_address=data.delivery.address,
        delivery_comment=data.delivery.comment,
        payment_method=data.payment_method,
        subtotal=prepared.subtotal,
        discount=prepared.discount,
        promo_code=prepared.promo.code if prepared.promo else None,
        promo_discount=prepared.promo_discount,
        bonus_spent=prepared.bonus_spent,
        delivery_price=prepared.delivery_price,
        total=prepared.total,
        scheduled_for=prepared.scheduled_for,
    )
    order.items = prepared.items_models

    db.add(order)
    await db.commit()

    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items).selectinload(OrderItem.toppings),
                selectinload(Order.review),
            )
        )
    ).scalar_one()

    topping_map = await get_topping_map(db)
    return serialize_order(order, topping_map)


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    public_token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    topping_map = await get_topping_map(db)
    order_uuid = parse_order_uuid(order_id)

    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order_uuid)
            .options(
                selectinload(Order.items).selectinload(OrderItem.toppings),
                selectinload(Order.review),
            )
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
            order_id=order.id,
            status=order.status,
            total=order.total,
            created_at=order.created_at.isoformat(),
            items_count=len(order.items),
            scheduled_for=order.scheduled_for.isoformat() if order.scheduled_for else None,
            promo_code=order.promo_code,
            promo_discount=order.promo_discount,
        )
        for order in orders
    ]


@router.get("/me/orders/{order_id}", response_model=OrderOut)
async def my_order_details(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order_uuid = parse_order_uuid(order_id)
    topping_map = await get_topping_map(db)
    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order_uuid, Order.user_id == user.id)
            .options(
                selectinload(Order.items).selectinload(OrderItem.toppings),
                selectinload(Order.review),
            )
        )
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(order, topping_map)


@router.post("/me/orders/{order_id}/review", response_model=OrderReviewOut)
async def save_order_review(
    order_id: str,
    data: OrderReviewIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order_uuid = parse_order_uuid(order_id)
    order = (
        await db.execute(
            select(Order)
            .where(Order.id == order_uuid, Order.user_id == user.id)
            .options(selectinload(Order.review))
        )
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "done":
        raise HTTPException(status_code=409, detail="Review is available only for completed orders")

    if order.review:
        order.review.rating = data.rating
        order.review.comment = data.comment
        review = order.review
    else:
        review = Review(order_id=order.id, user_id=user.id, rating=data.rating, comment=data.comment)
        db.add(review)

    await db.commit()
    await db.refresh(review)
    return serialize_review(review)
