import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/cartContext.jsx";
import { formatRUB } from "../utils/currency.js";
import { useAuth } from "../context/authContext.jsx";

function CartIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 7h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.7L5.3 3.5H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Header({ onOpenCart }) {
  const { state } = useCart();
  const { isAuthed, user } = useAuth();
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-lg font-semibold">
            Pizza Order
          </Link>

          <nav className="hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
            <Link to="/" className={`hover:text-foreground ${loc.pathname === "/" ? "text-foreground" : ""}`}>
              Главная
            </Link>
            <Link to="/menu" className={`hover:text-foreground ${loc.pathname === "/menu" ? "text-foreground" : ""}`}>
              Меню
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className={`hover:text-foreground ${loc.pathname === "/admin" ? "text-foreground" : ""}`}>
                Админ
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={isAuthed ? "/account" : "/login"}
            className="shine inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.99]"
            aria-label={isAuthed ? "Личный кабинет" : "Войти"}
            title={isAuthed ? "Личный кабинет" : "Войти"}
          >
            <UserIcon />
            <span className="hidden sm:inline">{isAuthed ? "Кабинет" : "Вход"}</span>
          </Link>

          <button
            onClick={onOpenCart}
            className="shine inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99]"
            aria-label="Корзина"
            title="Корзина"
          >
            <CartIcon />
            <span className="text-xs opacity-95">{formatRUB(state.total)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
