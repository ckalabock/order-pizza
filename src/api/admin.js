import { apiFetch } from "./client.js";

export const AdminAPI = {
  listOrders() {
    return apiFetch("/admin/orders", { auth: true });
  },
  updateOrderStatus(orderId, status) {
    return apiFetch(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      auth: true,
      body: { status }
    });
  },
  listReviews() {
    return apiFetch("/admin/reviews", { auth: true });
  },

  listPizzas() {
    return apiFetch("/admin/pizzas", { auth: true });
  },
  createPizza(payload) {
    return apiFetch("/admin/pizzas", { method: "POST", auth: true, body: payload });
  },
  updatePizza(id, payload) {
    return apiFetch(`/admin/pizzas/${id}`, { method: "PATCH", auth: true, body: payload });
  },
  deletePizza(id) {
    return apiFetch(`/admin/pizzas/${id}`, { method: "DELETE", auth: true });
  },

  listToppings() {
    return apiFetch("/admin/toppings", { auth: true });
  },
  createTopping(payload) {
    return apiFetch("/admin/toppings", { method: "POST", auth: true, body: payload });
  },
  updateTopping(id, payload) {
    return apiFetch(`/admin/toppings/${id}`, { method: "PATCH", auth: true, body: payload });
  },
  deleteTopping(id) {
    return apiFetch(`/admin/toppings/${id}`, { method: "DELETE", auth: true });
  },

  listSizes() {
    return apiFetch("/admin/sizes", { auth: true });
  },
  createSize(payload) {
    return apiFetch("/admin/sizes", { method: "POST", auth: true, body: payload });
  },
  updateSize(id, payload) {
    return apiFetch(`/admin/sizes/${id}`, { method: "PATCH", auth: true, body: payload });
  },

  listPromoCodes() {
    return apiFetch("/admin/promocodes", { auth: true });
  },
  createPromoCode(payload) {
    return apiFetch("/admin/promocodes", { method: "POST", auth: true, body: payload });
  },
  updatePromoCode(id, payload) {
    return apiFetch(`/admin/promocodes/${id}`, { method: "PATCH", auth: true, body: payload });
  },
  deletePromoCode(id) {
    return apiFetch(`/admin/promocodes/${id}`, { method: "DELETE", auth: true });
  }
};
