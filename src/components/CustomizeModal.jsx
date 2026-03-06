import React, { useEffect, useMemo, useState } from "react";
import { formatRUB } from "../utils/currency.js";
import { stableKey } from "../utils/id.js";
import { CatalogAPI } from "../api/catalog.js";

function calcUnit(basePrice, sizeMultiplier, toppingsSum) {
  return Math.round(basePrice * sizeMultiplier + toppingsSum);
}

export default function CustomizeModal({ open, onClose, pizza, onAdd }) {
  const [sizes, setSizes] = useState([]);
  const [toppingsAll, setToppingsAll] = useState([]);

  const [sizeId, setSizeId] = useState("m");
  const [toppings, setToppings] = useState([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    Promise.all([CatalogAPI.sizes(), CatalogAPI.toppings()])
      .then(([s, t]) => {
        if (!alive) return;
        setSizes(s);
        setToppingsAll(t);
      })
      .catch(() => {
        if (!alive) return;
        setSizes([]);
        setToppingsAll([]);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  const size = useMemo(() => sizes.find((s) => s.id === sizeId) || sizes[0], [sizes, sizeId]);

  const toppingsSum = useMemo(() => {
    return toppings
      .map((id) => toppingsAll.find((t) => t.id === id))
      .filter(Boolean)
      .reduce((s, t) => s + t.price, 0);
  }, [toppings, toppingsAll]);

  const unitPrice = useMemo(() => {
    if (!size) return pizza.basePrice;
    return calcUnit(pizza.basePrice, size.multiplier, toppingsSum);
  }, [pizza.basePrice, size, toppingsSum]);

  const imgSrc = pizza.image ? `/${pizza.image}` : null;

  function toggleTopping(id) {
    setToppings((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleAdd() {
    const toppingNames = toppings
      .map((id) => toppingsAll.find((t) => t.id === id)?.name)
      .filter(Boolean);

    const key = stableKey([pizza.id, sizeId, ...toppings.slice().sort()]);

    onAdd({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: size?.name || "Размер",
      toppings: toppingNames,
      unitPrice,
      qty,
      meta: { sizeId, toppingIds: toppings.slice() }
    });

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
          {imgSrc ? (
            <div className="aspect-[16/7] w-full bg-muted">
              <img src={imgSrc} alt={pizza.name} className="h-full w-full object-contain" />
            </div>
          ) : null}

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{pizza.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{pizza.description}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold">Размер</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      className={[
                        "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                        s.id === sizeId ? "bg-accent text-accent-foreground" : "bg-background"
                      ].join(" ")}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">Добавки</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {toppingsAll.map((t) => {
                    const active = toppings.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTopping(t.id)}
                        className={[
                          "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                          active ? "bg-accent text-accent-foreground" : "bg-background"
                        ].join(" ")}
                      >
                        {t.name} <span className="text-muted-foreground">+{formatRUB(t.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Кол-во</span>
                <div className="inline-flex items-center overflow-hidden rounded-xl border bg-background">
                  <button className="px-3 py-2 text-sm hover:bg-accent" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    -
                  </button>
                  <div className="px-3 py-2 text-sm">{qty}</div>
                  <button className="px-3 py-2 text-sm hover:bg-accent" onClick={() => setQty((q) => q + 1)}>
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Цена</div>
                  <div className="text-base font-semibold">{formatRUB(unitPrice)}</div>
                </div>

                <button
                  onClick={handleAdd}
                  className="shine rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99]"
                >
                  Добавить в корзину
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Реальная итоговая цена и скидки считаются на backend при создании заказа.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
