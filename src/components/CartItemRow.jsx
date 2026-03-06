import React from "react";
import QuantityControl from "./QuantityControl.jsx";
import { formatRUB } from "../utils/currency.js";

export default function CartItemRow({ item, onInc, onDec, onRemove }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{item.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Размер: {item.size}
            {item.toppings?.length ? ` • Добавки: ${item.toppings.join(", ")}` : ""}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Цена: {formatRUB(item.unitPrice)}</div>
        </div>

        <button
          onClick={onRemove}
          className="rounded-xl border px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
          aria-label="Удалить"
        >
          Удалить
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <QuantityControl value={item.qty} onDec={onDec} onInc={onInc} />
        <div className="text-sm font-semibold">{formatRUB(item.unitPrice * item.qty)}</div>
      </div>
    </div>
  );
}