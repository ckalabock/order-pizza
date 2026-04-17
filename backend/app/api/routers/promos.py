from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.promo import PromoCode
from app.schemas.promo import PromoCodePublicOut

router = APIRouter(tags=["promos"])


@router.get("/promocodes/active", response_model=list[PromoCodePublicOut])
async def active_promocodes(
    db: AsyncSession = Depends(get_db),
) -> list[PromoCodePublicOut]:
    promos = (
        await db.execute(
            select(PromoCode)
            .where(PromoCode.active.is_(True))
            .order_by(PromoCode.created_at.desc())
        )
    ).scalars().all()
    return [
        PromoCodePublicOut(
            id=promo.id,
            code=promo.code,
            title=promo.title,
            description=promo.description,
            discount_type=promo.discount_type,
            discount_value=promo.discount_value,
            min_order_total=promo.min_order_total,
        )
        for promo in promos
    ]
