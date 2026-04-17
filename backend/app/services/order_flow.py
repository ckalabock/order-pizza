from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Pizza
from app.models.order import OrderItem, OrderItemTopping
from app.models.promo import PromoCode
from app.models.user import User
from app.schemas.order import OrderPreviewIn
from app.services.bonuses import calc_bonus_stats
from app.services.pricing import calc_delivery, calc_discount_for_item, calc_unit_price

SCHEDULE_MIN_LEAD_MINUTES = 30
SCHEDULE_MAX_DAYS = 7


@dataclass
class PreparedOrder:
    items_models: list[OrderItem]
    subtotal_before_discount: int
    combo_discount: int
    promo_discount: int
    discount: int
    subtotal: int
    delivery_price: int
    total_before_bonuses: int
    bonus_spent: int
    total: int
    promo: PromoCode | None
    scheduled_for: datetime | None


def normalize_promo_code(code: str | None) -> str | None:
    if code is None:
        return None
    normalized = code.strip().upper()
    return normalized or None


def normalize_scheduled_for(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)

    now = datetime.now(UTC)
    if value < now + timedelta(minutes=SCHEDULE_MIN_LEAD_MINUTES):
        raise ValueError("Scheduled delivery must be at least 30 minutes from now")
    if value > now + timedelta(days=SCHEDULE_MAX_DAYS):
        raise ValueError("Scheduled delivery can be planned no more than 7 days ahead")
    return value


async def get_active_promo(db: AsyncSession, code: str | None) -> PromoCode | None:
    normalized = normalize_promo_code(code)
    if not normalized:
        return None

    promo = (
        await db.execute(
            select(PromoCode).where(PromoCode.code == normalized, PromoCode.active.is_(True))
        )
    ).scalar_one_or_none()
    if not promo:
        raise ValueError("Promo code not found or inactive")
    return promo


def calc_promo_discount(promo: PromoCode | None, subtotal_after_combo: int) -> int:
    if not promo or subtotal_after_combo <= 0:
        return 0

    if subtotal_after_combo < promo.min_order_total:
        raise ValueError(
            f"Promo code is available for orders from {promo.min_order_total} RUB"
        )

    if promo.discount_type == "percent":
        discount = int(round(subtotal_after_combo * promo.discount_value / 100))
    elif promo.discount_type == "fixed":
        discount = promo.discount_value
    else:
        raise ValueError("Unsupported promo type")

    return max(0, min(discount, subtotal_after_combo))


async def prepare_order(
    db: AsyncSession,
    data: OrderPreviewIn,
    user: User | None,
) -> PreparedOrder:
    promo = await get_active_promo(db, data.promo_code)
    scheduled_for = normalize_scheduled_for(data.scheduled_for)

    subtotal_before_discount = 0
    combo_discount = 0
    items_models: list[OrderItem] = []

    for item in data.items:
        pizza = (
            await db.execute(select(Pizza).where(Pizza.id == item.pizza_id, Pizza.available.is_(True)))
        ).scalar_one_or_none()
        if not pizza:
            raise ValueError(f"pizza not available: {item.pizza_id}")

        unit_price = await calc_unit_price(db, item.pizza_id, item.size_id, item.toppings)

        subtotal_before_discount += unit_price * item.qty
        combo_discount += calc_discount_for_item(item.pizza_id, item.toppings, unit_price, item.qty)

        order_item = OrderItem(
            pizza_id=item.pizza_id,
            size_id=item.size_id,
            qty=item.qty,
            unit_price=unit_price,
            title=pizza.name,
        )
        for topping_id, topping_qty in Counter(item.toppings).items():
            order_item.toppings.append(OrderItemTopping(topping_id=topping_id, qty=topping_qty))
        items_models.append(order_item)

    subtotal_after_combo = max(0, subtotal_before_discount - combo_discount)
    promo_discount = calc_promo_discount(promo, subtotal_after_combo)
    discount = combo_discount + promo_discount
    subtotal = max(0, subtotal_before_discount - discount)
    delivery_price = calc_delivery(subtotal, has_items=len(items_models) > 0)
    total_before_bonuses = subtotal + delivery_price

    requested_bonus_spent = data.bonus_spent
    if requested_bonus_spent and not user:
        raise ValueError("Bonuses are available only for authorized users")

    available_bonus_balance = 0
    if user:
        available_bonus_balance, _, _ = await calc_bonus_stats(db, user.id)

    if requested_bonus_spent > available_bonus_balance:
        raise ValueError("Not enough bonus balance")

    if requested_bonus_spent > total_before_bonuses:
        raise ValueError("Bonus spend exceeds order total")

    total = total_before_bonuses - requested_bonus_spent

    return PreparedOrder(
        items_models=items_models,
        subtotal_before_discount=subtotal_before_discount,
        combo_discount=combo_discount,
        promo_discount=promo_discount,
        discount=discount,
        subtotal=subtotal,
        delivery_price=delivery_price,
        total_before_bonuses=total_before_bonuses,
        bonus_spent=requested_bonus_spent,
        total=total,
        promo=promo,
        scheduled_for=scheduled_for,
    )
