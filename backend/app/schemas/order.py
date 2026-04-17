import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class OrderItemIn(BaseModel):
    pizza_id: str
    size_id: str
    toppings: list[str] = Field(default_factory=list)
    qty: int = Field(ge=1)


class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=40)


class DeliveryIn(BaseModel):
    address: str = Field(min_length=6, max_length=255)
    comment: str | None = Field(default=None, max_length=255)


class CreateOrderIn(BaseModel):
    customer: CustomerIn
    delivery: DeliveryIn
    payment_method: str = Field(pattern="^(card|cash)$")
    bonus_spent: int = Field(default=0, ge=0)
    promo_code: str | None = Field(default=None, min_length=3, max_length=40)
    scheduled_for: datetime | None = None
    items: list[OrderItemIn] = Field(min_length=1)


class OrderPreviewIn(BaseModel):
    bonus_spent: int = Field(default=0, ge=0)
    promo_code: str | None = Field(default=None, min_length=3, max_length=40)
    scheduled_for: datetime | None = None
    items: list[OrderItemIn] = Field(min_length=1)


class OrderReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


class OrderReviewOut(BaseModel):
    id: uuid.UUID
    rating: int
    comment: str | None
    created_at: str


class AdminReviewOut(OrderReviewOut):
    order_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str


class OrderItemOut(BaseModel):
    pizza_id: str
    size_id: str
    qty: int
    unit_price: int
    title: str
    toppings: list[str]


class OrderOut(BaseModel):
    order_id: uuid.UUID
    public_token: str
    status: str
    subtotal_before_discount: int
    combo_discount: int
    subtotal: int
    discount: int
    promo_code: str | None
    promo_discount: int
    bonus_spent: int
    delivery_price: int
    total: int
    created_at: str
    scheduled_for: str | None
    customer_name: str
    customer_phone: str
    delivery_address: str
    delivery_comment: str | None
    payment_method: str
    items: list[OrderItemOut]
    review: OrderReviewOut | None = None


class OrderPreviewOut(BaseModel):
    subtotal_before_discount: int
    combo_discount: int
    subtotal: int
    discount: int
    promo_code: str | None
    promo_discount: int
    delivery_price: int
    bonus_spent: int
    total_before_bonuses: int
    total: int
    scheduled_for: str | None


class OrderListItemOut(BaseModel):
    order_id: uuid.UUID
    status: str
    total: int
    created_at: str
    items_count: int
    scheduled_for: str | None = None
    promo_code: str | None = None
    promo_discount: int = 0


class OrderStatusIn(BaseModel):
    status: str = Field(pattern="^(created|confirmed|cooking|delivering|done|canceled)$")
