from pydantic import BaseModel


class PizzaOut(BaseModel):
    id: str
    name: str
    description: str
    base_price: int
    category: str
    image: str | None
    available: bool


class ToppingOut(BaseModel):
    id: str
    name: str
    price: int
    available: bool


class SizeOut(BaseModel):
    id: str
    name: str
    multiplier: float


class PizzaIn(BaseModel):
    id: str
    name: str
    description: str
    base_price: int
    category: str
    image: str | None = None
    available: bool = True


class ToppingIn(BaseModel):
    id: str
    name: str
    price: int
    available: bool = True


class SizeIn(BaseModel):
    id: str
    name: str
    multiplier: float
