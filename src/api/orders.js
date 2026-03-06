import { apiFetch } from "./client.js";

export const OrdersAPI = {
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
  }
};
