from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Pizza(Base):
    __tablename__ = "pizzas"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    base_price: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    image: Mapped[str | None] = mapped_column(String(255), nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Topping(Base):
    __tablename__ = "toppings"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Size(Base):
    __tablename__ = "sizes"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    multiplier: Mapped[float] = mapped_column(Float, nullable=False)
