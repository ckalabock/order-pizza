from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.catalog import Pizza, Size, Topping
from app.schemas.catalog import PizzaOut, SizeOut, ToppingOut

router = APIRouter(tags=["catalog"])


@router.get("/pizzas", response_model=list[PizzaOut])
async def list_pizzas(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    available: bool = Query(default=True),
) -> list[PizzaOut]:
    stmt = select(Pizza)
    if available:
        stmt = stmt.where(Pizza.available.is_(True))
    if category:
        stmt = stmt.where(Pizza.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Pizza.name.ilike(like)) | (Pizza.description.ilike(like)))
    res = await db.execute(stmt.order_by(Pizza.name.asc()))
    pizzas = res.scalars().all()
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


@router.get("/pizzas/{pizza_id}", response_model=PizzaOut)
async def get_pizza(pizza_id: str, db: AsyncSession = Depends(get_db)) -> PizzaOut:
    p = (await db.execute(select(Pizza).where(Pizza.id == pizza_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Pizza not found")
    return PizzaOut(
        id=p.id,
        name=p.name,
        description=p.description,
        base_price=p.base_price,
        category=p.category,
        image=p.image,
        available=p.available,
    )


@router.get("/toppings", response_model=list[ToppingOut])
async def list_toppings(
    db: AsyncSession = Depends(get_db), available: bool = Query(default=True)
) -> list[ToppingOut]:
    stmt = select(Topping)
    if available:
        stmt = stmt.where(Topping.available.is_(True))
    res = await db.execute(stmt.order_by(Topping.name.asc()))
    toppings = res.scalars().all()
    return [
        ToppingOut(id=t.id, name=t.name, price=t.price, available=t.available) for t in toppings
    ]


@router.get("/sizes", response_model=list[SizeOut])
async def list_sizes(db: AsyncSession = Depends(get_db)) -> list[SizeOut]:
    res = await db.execute(select(Size).order_by(Size.multiplier.asc()))
    sizes = res.scalars().all()
    return [SizeOut(id=s.id, name=s.name, multiplier=s.multiplier) for s in sizes]
