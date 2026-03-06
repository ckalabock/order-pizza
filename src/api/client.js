const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

function getToken() {
  try {
    return localStorage.getItem("pizza_access_token_v1");
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (!token) localStorage.removeItem("pizza_access_token_v1");
    else localStorage.setItem("pizza_access_token_v1", token);
  } catch {
    // ignore
  }
}

export async function apiFetch(path, { method = "GET", body, auth = false, headers = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === "string" ? data : (data?.detail || "Request failed");
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
