import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, setToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  async function loadMe() {
    try {
      const me = await apiFetch("/me", { auth: true });
      setUser(me);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsReady(true);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  const api = useMemo(() => {
    return {
      user,
      isReady,
      isAuthed: !!user,

      async login({ email, password }) {
        const tok = await apiFetch("/auth/login", {
          method: "POST",
          body: { email, password }
        });
        setToken(tok.access_token);
        await loadMe();
      },

      async register({ email, password, name }) {
        const tok = await apiFetch("/auth/register", {
          method: "POST",
          body: { email, password, name }
        });
        setToken(tok.access_token);
        await loadMe();
      },

      logout() {
        setToken(null);
        setUser(null);
      }
    };
  }, [user, isReady]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
