import { apiFetch } from "./client.js";

export const CatalogAPI = {
  async pizzas({ category = null } = {}) {
    const q = new URLSearchParams();
    if (category && category !== "all") q.set("category", category);
    return apiFetch(`/pizzas?${q.toString()}`);
  },
  async toppings() {
    return apiFetch("/toppings");
  },
  async sizes() {
    return apiFetch("/sizes");
  }
};
