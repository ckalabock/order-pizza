import React, { useEffect, useMemo, useState } from "react";
import { CatalogAPI } from "../api/catalog.js";
import { formatRUB } from "../utils/currency.js";
import { stableKey } from "../utils/id.js";

function calcUnit(basePrice, sizeMultiplier, toppingsSum) {
  return Math.round(basePrice * sizeMultiplier + toppingsSum);
}

function flattenToppingIds(toppingCounts) {
  return Object.entries(toppingCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([id, qty]) => Array.from({ length: qty }, () => id));
}

function buildToppingLabels(toppingCounts, toppingsAll) {
  return Object.entries(toppingCounts)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const name = toppingsAll.find((item) => item.id === id)?.name || id;
      return qty > 1 ? `${name} x${qty}` : name;
    });
}

export default function CustomizeModal({ open, onClose, pizza, onAdd }) {
  const [sizes, setSizes] = useState([]);
  const [toppingsAll, setToppingsAll] = useState([]);

  const [sizeId, setSizeId] = useState("m");
  const [toppingCounts, setToppingCounts] = useState({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    Promise.all([CatalogAPI.sizes(), CatalogAPI.toppings()])
      .then(([nextSizes, nextToppings]) => {
        if (!alive) return;
        setSizes(nextSizes);
        setToppingsAll(nextToppings);
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

  useEffect(() => {
    if (!open) return;
    setSizeId("m");
    setToppingCounts({});
    setQty(1);
  }, [open, pizza?.id]);

  const size = useMemo(() => sizes.find((item) => item.id === sizeId) || sizes[0], [sizes, sizeId]);

  const toppingsSum = useMemo(() => {
    return Object.entries(toppingCounts).reduce((sum, [id, count]) => {
      const topping = toppingsAll.find((item) => item.id === id);
      return sum + (topping ? topping.price * count : 0);
    }, 0);
  }, [toppingCounts, toppingsAll]);

  const unitPrice = useMemo(() => {
    if (!size) return pizza.basePrice;
    return calcUnit(pizza.basePrice, size.multiplier, toppingsSum);
  }, [pizza.basePrice, size, toppingsSum]);

  const imgSrc = pizza.image ? `/${pizza.image}` : null;

  function changeToppingCount(id, delta) {
    setToppingCounts((prev) => {
      const nextCount = Math.max(0, (prev[id] || 0) + delta);
      if (nextCount === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextCount };
    });
  }

  function handleAdd() {
    const toppingIds = flattenToppingIds(toppingCounts);
    const toppingNames = buildToppingLabels(toppingCounts, toppingsAll);
    const key = stableKey([pizza.id, sizeId, ...toppingIds]);

    onAdd({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: size?.name || "Размер",
      toppings: toppingNames,
      unitPrice,
      qty,
      meta: { sizeId, toppingIds }
    });

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2">
        <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
          {imgSrc ? (
            <div className="h-36 w-full shrink-0 bg-muted md:h-44">
              <img src={imgSrc} alt={pizza.name} className="h-full w-full object-contain" />
            </div>
          ) : null}

          <div className="overflow-y-auto p-4 md:p-5">
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

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold">Размер</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizes.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSizeId(item.id)}
                        className={[
                          "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                          item.id === sizeId ? "bg-accent text-accent-foreground" : "bg-background"
                        ].join(" ")}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Кол-во пицц</span>
                    <div className="inline-flex items-center overflow-hidden rounded-xl border bg-card">
                      <button
                        className="px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setQty((value) => Math.max(1, value - 1))}
                      >
                        -
                      </button>
                      <div className="px-3 py-2 text-sm">{qty}</div>
                      <button
                        className="px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setQty((value) => value + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold">Добавки</div>
                <div className="mt-2 max-h-[36vh] space-y-2 overflow-y-auto pr-1">
                  {toppingsAll.map((topping) => {
                    const currentCount = toppingCounts[topping.id] || 0;
                    return (
                      <div
                        key={topping.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{topping.name}</div>
                          <div className="text-xs leading-tight text-muted-foreground">
                            +{formatRUB(topping.price)} за каждую порцию
                          </div>
                        </div>

                        <div className="inline-flex shrink-0 items-center overflow-hidden rounded-xl border bg-card">
                          <button
                            type="button"
                            className="px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => changeToppingCount(topping.id, -1)}
                          >
                            -
                          </button>
                          <div className="min-w-9 px-2 py-2 text-center text-sm">{currentCount}</div>
                          <button
                            type="button"
                            className="px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => changeToppingCount(topping.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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

            <div className="mt-3 text-xs text-muted-foreground">
              Один и тот же топпинг можно добавить несколько раз. Итоговая цена и скидки
              подтверждаются на backend при создании заказа.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
