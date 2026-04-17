import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_admin
from app.models.catalog import Pizza, Size, Topping
from app.models.order import Order, Review
from app.models.promo import PromoCode
from app.models.user import User
from app.schemas.catalog import PizzaIn, PizzaOut, SizeIn, SizeOut, ToppingIn, ToppingOut
from app.schemas.order import AdminReviewOut, OrderListItemOut, OrderStatusIn
from app.schemas.promo import PromoCodeIn, PromoCodeOut
from app.services.order_flow import normalize_promo_code

router = APIRouter(tags=["admin"])


def parse_uuid(value: str, detail: str = "Invalid id format") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=detail) from exc


def serialize_pizza(pizza: Pizza) -> PizzaOut:
    return PizzaOut(
        id=pizza.id,
        name=pizza.name,
        description=pizza.description,
        base_price=pizza.base_price,
        category=pizza.category,
        image=pizza.image,
        available=pizza.available,
    )


def serialize_promo(promo: PromoCode) -> PromoCodeOut:
    return PromoCodeOut(
        id=promo.id,
        code=promo.code,
        title=promo.title,
        description=promo.description,
        discount_type=promo.discount_type,
        discount_value=promo.discount_value,
        min_order_total=promo.min_order_total,
        active=promo.active,
        created_at=promo.created_at.isoformat(),
    )


@router.get("/admin/pizzas", response_model=list[PizzaOut])
async def admin_list_pizzas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[PizzaOut]:
    _ = admin
    pizzas = (await db.execute(select(Pizza).order_by(Pizza.name.asc()))).scalars().all()
    return [serialize_pizza(pizza) for pizza in pizzas]


@router.post("/admin/pizzas", response_model=PizzaOut)
async def admin_create_pizza(
    data: PizzaIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PizzaOut:
    _ = admin
    exists = (await db.execute(select(Pizza).where(Pizza.id == data.id))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Pizza id exists")
    pizza = Pizza(**data.model_dump())
    db.add(pizza)
    await db.commit()
    await db.refresh(pizza)
    return serialize_pizza(pizza)


@router.patch("/admin/pizzas/{pizza_id}", response_model=PizzaOut)
async def admin_update_pizza(
    pizza_id: str,
    data: PizzaIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PizzaOut:
    _ = admin
    pizza = (await db.execute(select(Pizza).where(Pizza.id == pizza_id))).scalar_one_or_none()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")
    for key, value in data.model_dump().items():
        setattr(pizza, key, value)
    await db.commit()
    await db.refresh(pizza)
    return serialize_pizza(pizza)


@router.delete("/admin/pizzas/{pizza_id}", response_model=dict)
async def admin_delete_pizza(
    pizza_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    _ = admin
    pizza = (await db.execute(select(Pizza).where(Pizza.id == pizza_id))).scalar_one_or_none()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")
    pizza.available = False
    await db.commit()
    return {"id": pizza.id, "available": pizza.available}


@router.get("/admin/toppings", response_model=list[ToppingOut])
async def admin_list_toppings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[ToppingOut]:
    _ = admin
    toppings = (await db.execute(select(Topping).order_by(Topping.name.asc()))).scalars().all()
    return [ToppingOut(id=t.id, name=t.name, price=t.price, available=t.available) for t in toppings]


@router.post("/admin/toppings", response_model=ToppingOut)
async def admin_create_topping(
    data: ToppingIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ToppingOut:
    _ = admin
    exists = (await db.execute(select(Topping).where(Topping.id == data.id))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Topping id exists")
    topping = Topping(**data.model_dump())
    db.add(topping)
    await db.commit()
    await db.refresh(topping)
    return ToppingOut(id=topping.id, name=topping.name, price=topping.price, available=topping.available)


@router.patch("/admin/toppings/{topping_id}", response_model=ToppingOut)
async def admin_update_topping(
    topping_id: str,
    data: ToppingIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ToppingOut:
    _ = admin
    topping = (await db.execute(select(Topping).where(Topping.id == topping_id))).scalar_one_or_none()
    if not topping:
        raise HTTPException(status_code=404, detail="Topping not found")
    for key, value in data.model_dump().items():
        setattr(topping, key, value)
    await db.commit()
    await db.refresh(topping)
    return ToppingOut(id=topping.id, name=topping.name, price=topping.price, available=topping.available)


@router.delete("/admin/toppings/{topping_id}", response_model=dict)
async def admin_delete_topping(
    topping_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    _ = admin
    topping = (await db.execute(select(Topping).where(Topping.id == topping_id))).scalar_one_or_none()
    if not topping:
        raise HTTPException(status_code=404, detail="Topping not found")
    topping.available = False
    await db.commit()
    return {"id": topping.id, "available": topping.available}


@router.get("/admin/sizes", response_model=list[SizeOut])
async def admin_list_sizes(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[SizeOut]:
    _ = admin
    sizes = (await db.execute(select(Size).order_by(Size.multiplier.asc()))).scalars().all()
    return [SizeOut(id=s.id, name=s.name, multiplier=s.multiplier) for s in sizes]


@router.post("/admin/sizes", response_model=SizeOut)
async def admin_create_size(
    data: SizeIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SizeOut:
    _ = admin
    exists = (await db.execute(select(Size).where(Size.id == data.id))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Size id exists")
    size = Size(**data.model_dump())
    db.add(size)
    await db.commit()
    await db.refresh(size)
    return SizeOut(id=size.id, name=size.name, multiplier=size.multiplier)


@router.patch("/admin/sizes/{size_id}", response_model=SizeOut)
async def admin_update_size(
    size_id: str,
    data: SizeIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SizeOut:
    _ = admin
    size = (await db.execute(select(Size).where(Size.id == size_id))).scalar_one_or_none()
    if not size:
        raise HTTPException(status_code=404, detail="Size not found")
    for key, value in data.model_dump().items():
        setattr(size, key, value)
    await db.commit()
    await db.refresh(size)
    return SizeOut(id=size.id, name=size.name, multiplier=size.multiplier)


@router.get("/admin/orders", response_model=list[OrderListItemOut])
async def admin_list_orders(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[OrderListItemOut]:
    _ = admin
    res = await db.execute(
        select(Order).options(selectinload(Order.items)).order_by(desc(Order.created_at))
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


@router.patch("/admin/orders/{order_id}/status", response_model=dict)
async def admin_update_order_status(
    order_id: str,
    data: OrderStatusIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    _ = admin
    order_uuid = parse_uuid(order_id, "Invalid order_id format")
    order = (await db.execute(select(Order).where(Order.id == order_uuid))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = data.status
    await db.commit()
    await db.refresh(order)
    return {"order_id": str(order.id), "status": order.status}


@router.get("/admin/promocodes", response_model=list[PromoCodeOut])
async def admin_list_promocodes(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[PromoCodeOut]:
    _ = admin
    promos = (await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))).scalars().all()
    return [serialize_promo(promo) for promo in promos]


@router.post("/admin/promocodes", response_model=PromoCodeOut)
async def admin_create_promocode(
    data: PromoCodeIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PromoCodeOut:
    _ = admin
    code = normalize_promo_code(data.code)
    exists = (await db.execute(select(PromoCode).where(PromoCode.code == code))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Promo code already exists")

    promo = PromoCode(
        code=code,
        title=data.title,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_total=data.min_order_total,
        active=data.active,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return serialize_promo(promo)


@router.patch("/admin/promocodes/{promo_id}", response_model=PromoCodeOut)
async def admin_update_promocode(
    promo_id: str,
    data: PromoCodeIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> PromoCodeOut:
    _ = admin
    promo_uuid = parse_uuid(promo_id)
    promo = (await db.execute(select(PromoCode).where(PromoCode.id == promo_uuid))).scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    code = normalize_promo_code(data.code)
    exists = (
        await db.execute(select(PromoCode).where(PromoCode.code == code, PromoCode.id != promo_uuid))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Promo code already exists")

    promo.code = code
    promo.title = data.title
    promo.description = data.description
    promo.discount_type = data.discount_type
    promo.discount_value = data.discount_value
    promo.min_order_total = data.min_order_total
    promo.active = data.active
    await db.commit()
    await db.refresh(promo)
    return serialize_promo(promo)


@router.delete("/admin/promocodes/{promo_id}", response_model=dict)
async def admin_delete_promocode(
    promo_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    _ = admin
    promo_uuid = parse_uuid(promo_id)
    promo = (await db.execute(select(PromoCode).where(PromoCode.id == promo_uuid))).scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    promo.active = False
    await db.commit()
    return {"id": str(promo.id), "active": promo.active}


@router.get("/admin/reviews", response_model=list[AdminReviewOut])
async def admin_list_reviews(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[AdminReviewOut]:
    _ = admin
    rows = (
        await db.execute(
            select(Review, User)
            .join(User, User.id == Review.user_id)
            .order_by(desc(Review.created_at))
        )
    ).all()
    return [
        AdminReviewOut(
            id=review.id,
            order_id=review.order_id,
            user_id=review.user_id,
            user_name=user.name,
            user_email=user.email,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at.isoformat(),
        )
        for review, user in rows
    ]
