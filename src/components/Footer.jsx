import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";

export default function Footer() {
  const { isAuthed } = useAuth();

  return (
    <footer className="mt-10 border-t bg-background/70">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-base font-semibold">🍕 Pizza Order</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Свежие ингредиенты, авторские рецепты и быстрая доставка.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold">Навигация</div>
            <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" to="/">Главная</Link>
              <Link className="hover:text-foreground" to="/menu">Меню</Link>

              {/* Важно: если не вошёл — ведём на login */}
              <Link
                className="hover:text-foreground"
                to={isAuthed ? "/account" : "/login"}
                state={isAuthed ? undefined : { from: "/account" }}
              >
                Личный кабинет
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Контакты</div>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <div>Тел.: +7 (900) 000-00-00</div>
              <div>Email: support@pizza.local</div>
              <div>Время работы: 10:00–23:00</div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pizza Order. Все права защищены.
        </div>
      </div>
    </footer>
  );
}