import { apiFetch } from "./client.js";

export const UsersAPI = {
  me() {
    return apiFetch("/me", { auth: true });
  },
  bonuses() {
    return apiFetch("/me/bonuses", { auth: true });
  },
  addresses() {
    return apiFetch("/me/addresses", { auth: true });
  },
  createAddress(payload) {
    return apiFetch("/me/addresses", { method: "POST", auth: true, body: payload });
  },
  updateAddress(id, payload) {
    return apiFetch(`/me/addresses/${id}`, { method: "PATCH", auth: true, body: payload });
  },
  deleteAddress(id) {
    return apiFetch(`/me/addresses/${id}`, { method: "DELETE", auth: true });
  }
};
