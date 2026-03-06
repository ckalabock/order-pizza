import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/cartContext.jsx";
import { formatRUB } from "../utils/currency.js";
import CartItemRow from "./CartItemRow.jsx";

export default function CartDrawer({ open, onClose }) {
  const { state, inc, dec, remove, clear, constants } = useCart();

  return (
    <div className={["fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
      <div
        className={["absolute inset-0 bg-black/30 transition-opacity", open ? "opacity-100" : "opacity-0"].join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "absolute right-0 top-0 h-full w-full max-w-md border-l bg-background shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
        role="dialog"
        aria-label="Корзина"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-semibold">Корзина</div>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="flex h-[calc(100%-56px)] flex-col">
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {state.items.length === 0 ? (
              <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                Корзина пустая. Добавь пиццу из меню 🙂
              </div>
            ) : (
              state.items.map((it) => (
                <CartItemRow
                  key={it.key}
                  item={it}
                  onInc={() => inc(it.key)}
                  onDec={() => dec(it.key)}
                  onRemove={() => remove(it.key)}
                />
              ))
            )}
          </div>

          <div className="border-t p-4">
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Подытог</span>
                <span>{formatRUB(state.subtotalBeforeDiscount)}</span>
              </div>

              {state.discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Скидка</span>
                  <span className="text-primary">− {formatRUB(state.discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Доставка</span>
                <span>{state.delivery === 0 ? "Бесплатно" : formatRUB(state.delivery)}</span>
              </div>

              <div className="flex items-center justify-between text-base font-semibold">
                <span>Итого</span>
                <span>{formatRUB(state.total)}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Бесплатная доставка от {formatRUB(constants.FREE_DELIVERY_FROM)}.
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={clear}
                disabled={state.items.length === 0}
                className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Очистить
              </button>

              <Link
                to="/checkout"
                onClick={onClose}
                className={[
                  "w-full rounded-xl bg-primary px-4 py-2 text-center text-sm text-primary-foreground hover:opacity-90",
                  state.items.length === 0 ? "pointer-events-none opacity-50" : ""
                ].join(" ")}
              >
                Оформить заказ
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}