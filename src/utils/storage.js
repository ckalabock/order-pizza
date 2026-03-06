const KEY = "pizza_order_cart_v1";

export function loadCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCart(cartState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cartState));
  } catch {
    // ignore
  }
}

export function clearCartStorage() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}