import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { loadCart, saveCart } from "../utils/storage.js";

const CartContext = createContext(null);

const FREE_DELIVERY_FROM = 1000; // ₽
const DELIVERY_PRICE = 150; // ₽
const COMBO_DISCOUNT_RATE = 0.1; // 10%
const COMBO_RULE = {
  pizzaId: "pepperoni",
  toppingId: "extra_cheese"
};

function isComboItem(item) {
  // item.toppingIds хранится в item.meta
  const toppingIds = item?.meta?.toppingIds || [];
  return item.pizzaId === COMBO_RULE.pizzaId && toppingIds.includes(COMBO_RULE.toppingId);
}

function calcTotals(items) {
  const subtotalBeforeDiscount = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

  const discount = items.reduce((sum, it) => {
    // скидка применяется только на комбо-товар
    if (!isComboItem(it)) return sum;
    return sum + it.unitPrice * it.qty * COMBO_DISCOUNT_RATE;
  }, 0);

  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);

  const delivery =
    subtotal >= FREE_DELIVERY_FROM ? 0 : items.length ? DELIVERY_PRICE : 0;

  const total = subtotal + delivery;

  return { subtotalBeforeDiscount, discount, subtotal, delivery, total };
}

const initial = {
  items: [],
  ...calcTotals([])
};

function reducer(state, action) {
  switch (action.type) {
    case "INIT": {
      const next = action.payload || initial;
      const totals = calcTotals(next.items || []);
      return { ...initial, ...next, ...totals };
    }
    case "ADD": {
      const { item } = action.payload;
      const idx = state.items.findIndex((x) => x.key === item.key);
      let items = [...state.items];
      if (idx >= 0) {
        items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
      } else {
        items.push(item);
      }
      return { ...state, items, ...calcTotals(items) };
    }
    case "INC": {
      const { key } = action.payload;
      const items = state.items.map((it) => (it.key === key ? { ...it, qty: it.qty + 1 } : it));
      return { ...state, items, ...calcTotals(items) };
    }
    case "DEC": {
      const { key } = action.payload;
      const items = state.items
        .map((it) => (it.key === key ? { ...it, qty: it.qty - 1 } : it))
        .filter((it) => it.qty > 0);
      return { ...state, items, ...calcTotals(items) };
    }
    case "REMOVE": {
      const { key } = action.payload;
      const items = state.items.filter((it) => it.key !== key);
      return { ...state, items, ...calcTotals(items) };
    }
    case "CLEAR": {
      return { ...initial };
    }
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const saved = loadCart();
    if (saved) dispatch({ type: "INIT", payload: saved });
  }, []);

  useEffect(() => {
    saveCart({ items: state.items });
  }, [state.items]);

  const api = useMemo(() => {
    return {
      state,
      addItem: (item) => dispatch({ type: "ADD", payload: { item } }),
      inc: (key) => dispatch({ type: "INC", payload: { key } }),
      dec: (key) => dispatch({ type: "DEC", payload: { key } }),
      remove: (key) => dispatch({ type: "REMOVE", payload: { key } }),
      clear: () => dispatch({ type: "CLEAR" }),
      constants: { FREE_DELIVERY_FROM, DELIVERY_PRICE }
    };
  }, [state]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}