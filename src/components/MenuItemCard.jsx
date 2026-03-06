import React from "react";
import { formatRUB } from "../utils/currency.js";

export default function MenuItemCard({ pizza, onQuickAdd, onOpen }) {
  const imgSrc = pizza.image || null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-[1px] hover:bg-background"
    >
      {/* Фото */}
      <div className="aspect-[16/9] w-full bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={pizza.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{pizza.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{pizza.description}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">от</div>
            <div className="text-base font-semibold">{formatRUB(pizza.basePrice)}</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd();
            }}
            className="shine rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99]"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
