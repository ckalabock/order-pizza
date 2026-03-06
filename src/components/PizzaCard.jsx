import React, { useMemo, useState } from "react";
import { TOPPINGS, SIZES } from "../data/toppings.js";
import { formatEUR } from "../utils/currency.js";
import { stableKey } from "../utils/id.js";
import { useCart } from "../context/cartContext.jsx";

function calcPrice(basePrice, sizeId, toppingIds) {
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const toppingsSum = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter(Boolean)
    .reduce((s, t) => s + t.price, 0);

  const unit = basePrice * size.multiplier + toppingsSum;
  return Math.round(unit * 100) / 100;
}

export default function PizzaCard({ pizza }) {
  const { addItem } = useCart();
  const [sizeId, setSizeId] = useState("m");
  const [toppings, setToppings] = useState([]);
  const [qty, setQty] = useState(1);

  const unitPrice = useMemo(
    () => calcPrice(pizza.basePrice, sizeId, toppings),
    [pizza.basePrice, sizeId, toppings]
  );

  function toggleTopping(id) {
    setToppings((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onAdd() {
    const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
    const toppingNames = toppings
      .map((id) => TOPPINGS.find((t) => t.id === id)?.name)
      .filter(Boolean);

    const key = stableKey([pizza.id, sizeId, ...toppings.sort()]);
    addItem({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: size.name,
      toppings: toppingNames,
      unitPrice,
      qty
    });

    setQty(1);
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium">{pizza.name}</h3>
            {pizza.tags?.includes("hit") && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">Хит</span>
            )}
            {pizza.tags?.includes("new") && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">Новая</span>
            )}
            {pizza.tags?.includes("veg") && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">Veg</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{pizza.description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Цена</div>
          <div className="text-base font-medium">{formatEUR(unitPrice)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium">Размер</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className={[
                  "rounded-lg border px-3 py-2 text-sm hover:bg-accent",
                  s.id === sizeId ? "bg-accent" : "bg-card"
                ].join(" ")}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Добавки</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPPINGS.map((t) => {
              const active = toppings.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTopping(t.id)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm hover:bg-accent",
                    active ? "bg-accent" : "bg-card"
                  ].join(" ")}
                >
                  {t.name} <span className="text-muted-foreground">+{formatEUR(t.price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Кол-во</span>
          <div className="inline-flex items-center overflow-hidden rounded-lg border">
            <button
              className="px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <div className="px-3 py-2 text-sm">{qty}</div>
            <button className="px-3 py-2 text-sm hover:bg-accent" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99]"
        >
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}