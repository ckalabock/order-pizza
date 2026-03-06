import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password
from app.models.catalog import Pizza, Size, Topping
from app.models.order import Order, OrderItem, OrderItemTopping
from app.models.user import User, UserAddress

FREE_DELIVERY_FROM = 1000
DELIVERY_PRICE = 150
COMBO_DISCOUNT_RATE = 0.10
COMBO_PIZZA_ID = "pepperoni"
COMBO_TOPPING_ID = "extra_cheese"


def make_public_token() -> str:
    return secrets.token_hex(32)


async def calc_unit_price(
    db: AsyncSession, pizza_id: str, size_id: str, topping_ids: list[str]
) -> int:
    pizza = (
        await db.execute(select(Pizza).where(Pizza.id == pizza_id, Pizza.available.is_(True)))
    ).scalar_one_or_none()
    if not pizza:
        raise ValueError("Pizza not found")

    size = (await db.execute(select(Size).where(Size.id == size_id))).scalar_one_or_none()
    if not size:
        raise ValueError("Size not found")

    toppings: list[Topping] = []
    if topping_ids:
        toppings = (
            await db.execute(
                select(Topping).where(
                    Topping.id.in_(topping_ids), Topping.available.is_(True)
                )
            )
        ).scalars().all()
        if len(toppings) != len(set(topping_ids)):
            raise ValueError("Topping not found")

    toppings_sum = sum(t.price for t in toppings)
    unit = int(round(pizza.base_price * size.multiplier + toppings_sum))
    return unit


def calc_discount_for_item(pizza_id: str, topping_ids: list[str], unit_price: int, qty: int) -> int:
    if pizza_id == COMBO_PIZZA_ID and COMBO_TOPPING_ID in topping_ids:
        return int(round(unit_price * qty * COMBO_DISCOUNT_RATE))
    return 0


def calc_delivery(subtotal_after_discount: int, has_items: bool) -> int:
    if not has_items:
        return 0
    return 0 if subtotal_after_discount >= FREE_DELIVERY_FROM else DELIVERY_PRICE


SEED_SIZES = [
    {"id": "s", "name": "25 cm", "multiplier": 1.0},
    {"id": "m", "name": "30 cm", "multiplier": 1.25},
    {"id": "l", "name": "35 cm", "multiplier": 1.5},
]

SEED_TOPPINGS = [
    {"id": "extra_cheese", "name": "Extra cheese", "price": 80, "available": True},
    {"id": "mushrooms", "name": "Mushrooms", "price": 70, "available": True},
    {"id": "jalapeno", "name": "Jalapeno", "price": 60, "available": True},
    {"id": "olives", "name": "Olives", "price": 60, "available": True},
    {"id": "bacon", "name": "Bacon", "price": 90, "available": True},
]

SEED_PIZZAS = [
    {
        "id": "margherita",
        "name": "Margherita",
        "description": "Classic tomato sauce, mozzarella and basil",
        "base_price": 450,
        "category": "classic",
        "image": "pic/marg.avif",
        "available": True,
    },
    {
        "id": "pepperoni",
        "name": "Pepperoni",
        "description": "Spicy pepperoni and mozzarella",
        "base_price": 550,
        "category": "meat",
        "image": "pic/pipi.avif",
        "available": True,
    },
    {
        "id": "four_cheese",
        "name": "Four Cheese",
        "description": "Blend of four cheeses",
        "base_price": 600,
        "category": "veg",
        "image": "pic/sir.avif",
        "available": True,
    },
    {
        "id": "bbq",
        "name": "BBQ",
        "description": "Chicken, bbq sauce, onion and mozzarella",
        "base_price": 620,
        "category": "meat",
        "image": "pic/bbq.avif",
        "available": True,
    },
    {
        "id": "hawaii",
        "name": "Hawaii",
        "description": "Ham, pineapple, mozzarella and sauce",
        "base_price": 590,
        "category": "classic",
        "image": "pic/gav.avif",
        "available": True,
    },
    {
        "id": "tuna",
        "name": "Tuna",
        "description": "Tuna, onion, cheese and sauce",
        "base_price": 650,
        "category": "fish",
        "image": "pic/tunec.avif",
        "available": True,
    },
]

SEED_USERS = [
    {"email": "peter@mail.ru", "name": "Peter", "password": "123456", "role": "user"},
    {"email": "vasya@mail.ru", "name": "Vasya", "password": "123456", "role": "user"},
]

SEED_ORDER_TEMPLATES = [
    {
        "customer_name": "Peter",
        "customer_phone": "+79990000001",
        "delivery_address": "Moscow, Tverskaya 1",
        "delivery_comment": "Leave at the door",
        "payment_method": "card",
        "status": "done",
        "items": [
            {"pizza_id": "pepperoni", "size_id": "m", "qty": 1, "toppings": ["extra_cheese"]},
            {"pizza_id": "margherita", "size_id": "s", "qty": 1, "toppings": []},
        ],
    },
    {
        "customer_name": "Vasya",
        "customer_phone": "+79990000002",
        "delivery_address": "Moscow, Arbat 15",
        "delivery_comment": "Call before delivery",
        "payment_method": "cash",
        "status": "confirmed",
        "items": [
            {"pizza_id": "bbq", "size_id": "l", "qty": 1, "toppings": ["bacon"]},
        ],
    },
]


async def seed_catalog(db: AsyncSession) -> None:
    for s in SEED_SIZES:
        if not (await db.execute(select(Size).where(Size.id == s["id"]))).scalar_one_or_none():
            db.add(Size(**s))

    for t in SEED_TOPPINGS:
        if not (await db.execute(select(Topping).where(Topping.id == t["id"]))).scalar_one_or_none():
            db.add(Topping(**t))

    for p in SEED_PIZZAS:
        if not (await db.execute(select(Pizza).where(Pizza.id == p["id"]))).scalar_one_or_none():
            db.add(Pizza(**p))

    await db.commit()


async def ensure_user(db: AsyncSession, email: str, name: str, password: str, role: str = "user") -> User:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        if user.role != role:
            user.role = role
            await db.commit()
            await db.refresh(user)
        return user

    user = User(email=email, name=name, password_hash=hash_password(password), role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_seed_order_for_user(db: AsyncSession, user: User, template: dict) -> None:
    existing = (
        await db.execute(select(Order).where(Order.user_id == user.id).limit(1))
    ).scalar_one_or_none()
    if existing:
        return

    subtotal_before_discount = 0
    discount = 0
    order_items: list[OrderItem] = []

    for item in template["items"]:
        pizza = (await db.execute(select(Pizza).where(Pizza.id == item["pizza_id"]))).scalar_one_or_none()
        if not pizza:
            continue

        unit_price = await calc_unit_price(db, item["pizza_id"], item["size_id"], item["toppings"])
        qty = item["qty"]

        subtotal_before_discount += unit_price * qty
        discount += calc_discount_for_item(item["pizza_id"], item["toppings"], unit_price, qty)

        oi = OrderItem(
            pizza_id=item["pizza_id"],
            size_id=item["size_id"],
            qty=qty,
            unit_price=unit_price,
            title=pizza.name,
        )
        for tid in item["toppings"]:
            oi.toppings.append(OrderItemTopping(topping_id=tid))
        order_items.append(oi)

    subtotal = max(0, subtotal_before_discount - discount)
    delivery_price = calc_delivery(subtotal, has_items=len(order_items) > 0)
    total = subtotal + delivery_price

    order = Order(
        user_id=user.id,
        public_token=make_public_token(),
        status=template["status"],
        customer_name=template["customer_name"],
        customer_phone=template["customer_phone"],
        delivery_address=template["delivery_address"],
        delivery_comment=template["delivery_comment"],
        payment_method=template["payment_method"],
        subtotal=subtotal,
        discount=discount,
        delivery_price=delivery_price,
        total=total,
    )
    order.items = order_items
    db.add(order)
    await db.commit()


async def seed_demo_users_and_orders(db: AsyncSession) -> None:
    peter = await ensure_user(db, **SEED_USERS[0])
    vasya = await ensure_user(db, **SEED_USERS[1])

    peter_addr = (
        await db.execute(select(UserAddress).where(UserAddress.user_id == peter.id).limit(1))
    ).scalar_one_or_none()
    if not peter_addr:
        db.add(
            UserAddress(
                user_id=peter.id,
                label="Home",
                address="Moscow, Tverskaya 1",
                comment="Intercom 12",
                is_default=True,
            )
        )

    vasya_addr = (
        await db.execute(select(UserAddress).where(UserAddress.user_id == vasya.id).limit(1))
    ).scalar_one_or_none()
    if not vasya_addr:
        db.add(
            UserAddress(
                user_id=vasya.id,
                label="Home",
                address="Moscow, Arbat 15",
                comment="Call before delivery",
                is_default=True,
            )
        )

    await db.commit()

    await create_seed_order_for_user(db, peter, SEED_ORDER_TEMPLATES[0])
    await create_seed_order_for_user(db, vasya, SEED_ORDER_TEMPLATES[1])


async def seed_all(db: AsyncSession) -> None:
    await seed_catalog(db)
    await seed_demo_users_and_orders(db)


if __name__ == "__main__":
    import asyncio
    import sys

    from app.core.database import SessionLocal

    async def _run() -> None:
        async with SessionLocal() as db:
            await seed_all(db)
        print("Seed completed.")

    if len(sys.argv) >= 2 and sys.argv[1] == "seed":
        asyncio.run(_run())
