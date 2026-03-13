import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order

BONUS_ACCRUAL_RATE = 0.05


async def calc_bonus_stats(db: AsyncSession, user_id: uuid.UUID) -> tuple[int, int, int]:
    done_total = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.user_id == user_id,
                Order.status == "done",
            )
        )
    ).scalar_one()

    spent_total = (
        await db.execute(
            select(func.coalesce(func.sum(Order.bonus_spent), 0)).where(
                Order.user_id == user_id,
                Order.status != "canceled",
            )
        )
    ).scalar_one()

    accrued = int(done_total * BONUS_ACCRUAL_RATE)
    spent = int(spent_total)
    balance = max(0, accrued - spent)
    return balance, accrued, spent
