import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const from = useMemo(() => loc.state?.from || "/account", [loc.state]);

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 3500);
    return () => clearTimeout(timer);
  }, [showToast]);

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    try {
      if (mode === "login") {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        await register({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || "Пользователь"
        });
      }
      nav(from, { replace: true });
    } catch (e2) {
      const msg =
        mode === "login"
          ? e2?.status === 401
            ? "Неправильный логин или пароль"
            : "Сервер недоступен. Проверьте, что backend запущен."
          : e2?.message || "Ошибка регистрации";
      setErr(msg);
      setShowToast(true);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
      {showToast && (
        <div className="fixed right-4 top-4 z-[200] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Ошибка авторизации</div>
              <div className="mt-0.5">{err || "Проверьте логин и пароль"}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="rounded-md px-2 py-1 text-xs hover:bg-red-100"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold">{mode === "login" ? "Вход" : "Регистрация"}</h1>

      {err ? (
        <div className="mt-3 rounded-xl border bg-background p-3 text-sm text-primary">{err}</div>
      ) : null}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="space-y-1">
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-xl border bg-input-background px-3 py-2"
            placeholder="name@example.com"
          />
        </div>

        {mode === "register" ? (
          <div className="space-y-1">
            <label>Имя</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-xl border bg-input-background px-3 py-2"
              placeholder="Например: Артур"
            />
          </div>
        ) : null}

        <div className="space-y-1">
          <label>Пароль</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-xl border bg-input-background px-3 py-2"
            placeholder="Минимум 6 символов"
          />
        </div>

        <button
          type="submit"
          className="shine w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        <div className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Нет аккаунта?{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={() => setMode("register")}
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={() => setMode("login")}
              >
                Войти
              </button>
            </>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            {"<- На главную"}
          </Link>
        </div>
      </form>
    </div>
  );
}
