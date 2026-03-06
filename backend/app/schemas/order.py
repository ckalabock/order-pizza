import uuid

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
    items: list[OrderItemIn] = Field(min_length=1)


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
    subtotal: int
    discount: int
    delivery_price: int
    total: int
    created_at: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    delivery_comment: str | None
    payment_method: str
    items: list[OrderItemOut]


class OrderListItemOut(BaseModel):
    order_id: uuid.UUID
    status: str
    total: int
    created_at: str
    items_count: int


class OrderStatusIn(BaseModel):
    status: str = Field(pattern="^(created|confirmed|cooking|delivering|done|canceled)$")
