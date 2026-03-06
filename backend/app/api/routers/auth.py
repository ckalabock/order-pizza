from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginIn, RegisterIn, TokenOut

router = APIRouter(tags=["auth"])

ADMIN_LOGIN = "pavelkimov@gmail.com"
ADMIN_PASSWORD = "123456"
ADMIN_NAME = "Pavel Kimov Admin"


async def ensure_admin_user(db: AsyncSession) -> User:
    admin = (await db.execute(select(User).where(User.email == ADMIN_LOGIN))).scalar_one_or_none()
    if admin:
        if admin.role != "admin":
            admin.role = "admin"
            await db.commit()
            await db.refresh(admin)
        return admin

    admin = User(
        email=ADMIN_LOGIN,
        name=ADMIN_NAME,
        password_hash=hash_password(ADMIN_PASSWORD),
        role="admin",
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


@router.post("/auth/register", response_model=TokenOut)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    exists = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(sub=str(user.id), role=user.role)
    return TokenOut(access_token=token)


@router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    if data.login == ADMIN_LOGIN and data.password == ADMIN_PASSWORD:
        admin = await ensure_admin_user(db)
        token = create_access_token(sub=str(admin.id), role=admin.role)
        return TokenOut(access_token=token)

    user = (await db.execute(select(User).where(User.email == data.login))).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(sub=str(user.id), role=user.role)
    return TokenOut(access_token=token)
