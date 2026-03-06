import uuid

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    role: str


class UserUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)


class UserAddressIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    address: str = Field(min_length=6, max_length=255)
    comment: str | None = Field(default=None, max_length=255)
    is_default: bool = False


class UserAddressUpdateIn(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=80)
    address: str | None = Field(default=None, min_length=6, max_length=255)
    comment: str | None = Field(default=None, max_length=255)
    is_default: bool | None = None


class UserAddressOut(BaseModel):
    id: uuid.UUID
    label: str
    address: str
    comment: str | None
    is_default: bool
    created_at: str


class BonusOut(BaseModel):
    balance: int
    accrued: int
    spent: int
