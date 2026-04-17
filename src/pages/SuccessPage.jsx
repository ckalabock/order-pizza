import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OrdersAPI } from "../api/orders.js";
import { formatRUB } from "../utils/currency.js";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  const canLoad = useMemo(() => Boolean(orderId && token), [orderId, token]);

  async function loadOrder() {
    if (!canLoad) return;
    setErr("");
    setLoading(true);
    try {
      const nextOrder = await OrdersAPI.getOrder(orderId, token);
      setOrder(nextOrder);
    } catch (error) {
      setErr(error?.message || "Не удалось загрузить заказ");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Заказ оформлен</h1>

        {orderId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Номер заказа: <span className="font-semibold text-foreground">{orderId}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Номер заказа не передан.</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/menu"
            className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            В меню
          </Link>

          <button
            onClick={loadOrder}
            disabled={!canLoad || loading}
            className="rounded-xl border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {loading ? "Загружаю..." : "Проверить статус заказа"}
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border bg-background p-3 text-sm text-primary">
            {err}
          </div>
        ) : null}
      </div>

      {order ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold">Статус: {order.status}</div>
            <div className="text-base font-semibold">{formatRUB(order.total)}</div>
          </div>

          {order.scheduled_for ? (
            <div className="mt-2 text-sm text-muted-foreground">
              Запланированная доставка: {formatDate(order.scheduled_for)}
            </div>
          ) : null}

          {order.promo_code ? (
            <div className="mt-1 text-sm text-muted-foreground">
              Промокод {order.promo_code} применен на сумму{" "}
              {formatRUB(order.promo_discount)}.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {order.items.map((item, index) => (
              <div key={`${item.pizza_id}-${index}`} className="rounded-xl border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Размер: {item.size_id} • Кол-во: {item.qty}
                      {item.toppings?.length
                        ? ` • Добавки: ${item.toppings.join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <div className="shrink-0">{formatRUB(item.unit_price * item.qty)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Доставка:{" "}
            {order.delivery_price === 0 ? "Бесплатно" : formatRUB(order.delivery_price)} •
            {" "}Скидка: {order.discount ? `- ${formatRUB(order.discount)}` : "нет"} •
            {" "}Бонусы: {order.bonus_spent ? `- ${formatRUB(order.bonus_spent)}` : "нет"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
