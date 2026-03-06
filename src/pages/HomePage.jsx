import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PIZZAS } from "../data/pizzas.js";
import { formatRUB } from "../utils/currency.js";
import { useCart } from "../context/cartContext.jsx";
import { stableKey } from "../utils/id.js";

export default function HomePage() {
  const popular = useMemo(() => {
    const ids = ["margherita", "pepperoni", "four_cheese"];
    return PIZZAS.filter((p) => ids.includes(p.id));
  }, []);

  const { addItem } = useCart();
  const nav = useNavigate();

  function addPopular(pizza) {
    const key = stableKey([pizza.id, "m"]);
    addItem({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: "30 см",
      toppings: [],
      unitPrice: Math.round(pizza.basePrice * 1.25),
      qty: 1,
      meta: { sizeId: "m", toppingIds: [] }
    });
    nav("/menu");
  }

  function addCombo() {
    // Комбо: Пепперони + доп. сыр (скидка применится на уровне cartContext по правилу)
    const pizza = PIZZAS.find((p) => p.id === "pepperoni");
    if (!pizza) return;

    const key = stableKey([pizza.id, "m", "extra_cheese"]);
    addItem({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: "30 см",
      toppings: ["Доп. сыр"],
      unitPrice: Math.round(pizza.basePrice * 1.25) + 80, // сыр +80 (см toppings.js)
      qty: 1,
      meta: { sizeId: "m", toppingIds: ["extra_cheese"] }
    });
    nav("/menu");
  }

  return (
    <div className="space-y-6">
      <section className="pizza-hero overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">Вкуснейшая пицца с доставкой на дом</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Свежие ингредиенты, авторские рецепты и быстрая доставка. Попробуйте лучшую пиццу в городе уже сегодня!
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/menu"
            className="shine inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm hover:opacity-90"
          >
            Смотреть меню
          </Link>
          <button
            onClick={addCombo}
            className="shine inline-flex items-center justify-center rounded-xl border bg-background px-5 py-3 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Заказать комбо дня -10%
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-background p-4">
            <div className="text-sm font-semibold">Быстрая доставка</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Доставим вашу пиццу горячей в течение 30 минут или бесплатно
            </div>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <div className="text-sm font-semibold">Свежие продукты</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Используем только свежие ингредиенты высшего качества
            </div>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <div className="text-sm font-semibold">Бесплатная доставка</div>
            <div className="mt-1 text-sm text-muted-foreground">
              При заказе от 1000 рублей доставка по городу бесплатно
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Популярные пиццы</h2>
          <Link className="text-sm text-muted-foreground hover:text-foreground" to="/menu">
            Посмотреть все пиццы →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {popular.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-base font-semibold">{p.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.description}</div>
              <div className="mt-3 text-sm text-muted-foreground">
                от <span className="text-foreground font-semibold">{formatRUB(p.basePrice)}</span>
              </div>
              <button
                onClick={() => addPopular(p)}
                className="shine mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Выбрать
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-semibold">Голодны?</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Закажите пиццу прямо сейчас и получите скидку 10% на первый заказ!
            </div>
          </div>
          <Link
            to="/menu"
            className="shine inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground hover:opacity-90"
          >
            Заказать сейчас
          </Link>
        </div>
      </section>
    </div>
  );
}