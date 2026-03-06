import React from "react";

export default function QuantityControl({ value, onDec, onInc }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border">
      <button className="px-3 py-2 text-sm hover:bg-accent" onClick={onDec} aria-label="Уменьшить">
        −
      </button>
      <div className="px-3 py-2 text-sm">{value}</div>
      <button className="px-3 py-2 text-sm hover:bg-accent" onClick={onInc} aria-label="Увеличить">
        +
      </button>
    </div>
  );
}