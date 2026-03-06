import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.order import Order
from app.models.user import User, UserAddress
from app.schemas.user import (
    BonusOut,
    UserAddressIn,
    UserAddressOut,
    UserAddressUpdateIn,
    UserOut,
    UserUpdateIn,
)

router = APIRouter(tags=["users"])


def parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid id format") from exc


async def clear_default_address(db: AsyncSession, user_id: uuid.UUID) -> None:
    addresses = (await db.execute(select(UserAddress).where(UserAddress.user_id == user_id))).scalars().all()
    for a in addresses:
        a.is_default = False


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role)


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    if data.name is not None:
        user.name = data.name
    await db.commit()
    await db.refresh(user)
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role)


@router.get("/me/addresses", response_model=list[UserAddressOut])
async def my_addresses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[UserAddressOut]:
    addresses = (
        await db.execute(
            select(UserAddress)
            .where(UserAddress.user_id == user.id)
            .order_by(desc(UserAddress.is_default), desc(UserAddress.created_at))
        )
    ).scalars().all()
    return [
        UserAddressOut(
            id=a.id,
            label=a.label,
            address=a.address,
            comment=a.comment,
            is_default=a.is_default,
            created_at=a.created_at.isoformat(),
        )
        for a in addresses
    ]


@router.post("/me/addresses", response_model=UserAddressOut)
async def create_address(
    data: UserAddressIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserAddressOut:
    existing = (await db.execute(select(UserAddress).where(UserAddress.user_id == user.id))).scalars().all()

    is_default = data.is_default or len(existing) == 0
    if is_default:
        await clear_default_address(db, user.id)

    address = UserAddress(
        user_id=user.id,
        label=data.label,
        address=data.address,
        comment=data.comment,
        is_default=is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)

    return UserAddressOut(
        id=address.id,
        label=address.label,
        address=address.address,
        comment=address.comment,
        is_default=address.is_default,
        created_at=address.created_at.isoformat(),
    )


@router.patch("/me/addresses/{address_id}", response_model=UserAddressOut)
async def update_address(
    address_id: str,
    data: UserAddressUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserAddressOut:
    addr_uuid = parse_uuid(address_id)
    address = (
        await db.execute(select(UserAddress).where(UserAddress.id == addr_uuid, UserAddress.user_id == user.id))
    ).scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if data.label is not None:
        address.label = data.label
    if data.address is not None:
        address.address = data.address
    if data.comment is not None:
        address.comment = data.comment
    if data.is_default is not None:
        if data.is_default:
            await clear_default_address(db, user.id)
            address.is_default = True
        else:
            address.is_default = False

    await db.commit()
    await db.refresh(address)

    return UserAddressOut(
        id=address.id,
        label=address.label,
        address=address.address,
        comment=address.comment,
        is_default=address.is_default,
        created_at=address.created_at.isoformat(),
    )


@router.delete("/me/addresses/{address_id}", response_model=dict)
async def delete_address(
    address_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    addr_uuid = parse_uuid(address_id)
    address = (
        await db.execute(select(UserAddress).where(UserAddress.id == addr_uuid, UserAddress.user_id == user.id))
    ).scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default
    await db.delete(address)
    await db.commit()

    if was_default:
        next_addr = (
            await db.execute(
                select(UserAddress)
                .where(UserAddress.user_id == user.id)
                .order_by(desc(UserAddress.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        if next_addr:
            next_addr.is_default = True
            await db.commit()

    return {"deleted": str(addr_uuid)}


@router.get("/me/bonuses", response_model=BonusOut)
async def my_bonuses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BonusOut:
    done_total = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.user_id == user.id,
                Order.status == "done",
            )
        )
    ).scalar_one()

    accrued = int(done_total * 0.05)
    spent = 0
    balance = accrued - spent
    return BonusOut(balance=balance, accrued=accrued, spent=spent)
