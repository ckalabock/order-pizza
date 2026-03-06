import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_admin
from app.models.catalog import Pizza, Size, Topping
from app.models.order import Order
from app.models.user import User
from app.schemas.catalog import PizzaIn, PizzaOut, SizeIn, SizeOut, ToppingIn, ToppingOut
from app.schemas.order import OrderListItemOut, OrderStatusIn

router = APIRouter(tags=["admin"])


def parse_order_uuid(order_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid order_id format") from exc


@router.get("/admin/pizzas", response_model=list[PizzaOut])
async def admin_list_pizzas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[PizzaOut]:
    _ = admin
    pizzas = (await db.execute(select(Pizza).order_by(Pizza.name.asc()))).scalars().all()
    return [
        PizzaOut(
            id=p.id,
            name=p.name,
            description=p.description,
            base_price=p.base_price,
            category=p.category,
            image=p.image,
            available=p.available,
        )
        for p in pizzas
    ]


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
    return PizzaOut(
        id=pizza.id,
        name=pizza.name,
        description=pizza.description,
        base_price=pizza.base_price,
        category=pizza.category,
        image=pizza.image,
        available=pizza.available,
    )


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
    return PizzaOut(
        id=pizza.id,
        name=pizza.name,
        description=pizza.description,
        base_price=pizza.base_price,
        category=pizza.category,
        image=pizza.image,
        available=pizza.available,
    )


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
            order_id=o.id,
            status=o.status,
            total=o.total,
            created_at=o.created_at.isoformat(),
            items_count=len(o.items),
        )
        for o in orders
    ]


@router.patch("/admin/orders/{order_id}/status", response_model=dict)
async def admin_update_order_status(
    order_id: str,
    data: OrderStatusIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    _ = admin
    order_uuid = parse_order_uuid(order_id)
    order = (await db.execute(select(Order).where(Order.id == order_uuid))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = data.status
    await db.commit()
    await db.refresh(order)
    return {"order_id": str(order.id), "status": order.status}
