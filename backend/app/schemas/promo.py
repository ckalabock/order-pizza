import uuid

from pydantic import BaseModel, Field


class PromoCodeBase(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    title: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    discount_type: str = Field(pattern="^(percent|fixed)$")
    discount_value: int = Field(ge=1, le=100000)
    min_order_total: int = Field(default=0, ge=0)


class PromoCodeIn(PromoCodeBase):
    active: bool = True


class PromoCodeOut(PromoCodeBase):
    id: uuid.UUID
    active: bool
    created_at: str


class PromoCodePublicOut(PromoCodeBase):
    id: uuid.UUID
