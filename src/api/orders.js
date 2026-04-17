import { apiFetch } from "./client.js";

export const OrdersAPI = {
  async previewOrder(payload, { auth = false } = {}) {
    return apiFetch("/orders/preview", { method: "POST", body: payload, auth });
  },
  async createOrder(payload, { auth = false } = {}) {
    return apiFetch("/orders", { method: "POST", body: payload, auth });
  },
  async getOrder(orderId, publicToken) {
    const q = new URLSearchParams({ public_token: publicToken });
    return apiFetch(`/orders/${orderId}?${q.toString()}`);
  },
  async myOrders() {
    return apiFetch("/me/orders", { auth: true });
  },
  async myOrder(orderId) {
    return apiFetch(`/me/orders/${orderId}`, { auth: true });
  },
  async saveReview(orderId, payload) {
    return apiFetch(`/me/orders/${orderId}/review`, {
      method: "POST",
      auth: true,
      body: payload
    });
  }
};
