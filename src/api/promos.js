import { apiFetch } from "./client.js";

export const PromosAPI = {
  listActive() {
    return apiFetch("/promocodes/active");
  }
};
