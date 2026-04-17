import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OrdersAPI } from "../api/orders.js";
import { UsersAPI } from "../api/users.js";
import { useAuth } from "../context/authContext.jsx";
import { formatRUB } from "../utils/currency.js";

function formatDate(value) {
  if (!value) return "Не указано";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

export default function AccountPage() {
  const { user, isAuthed, logout } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [bonuses, setBonuses] = useState({ balance: 0, accrued: 0, spent: 0 });
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: "" });
  const [orderLoading, setOrderLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);

  const [newAddress, setNewAddress] = useState({
    label: "Дом",
    address: "",
    comment: "",
    is_default: false
  });

  const ordersCount = useMemo(() => orders.length, [orders]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [myOrders, myAddresses, myBonuses] = await Promise.all([
        OrdersAPI.myOrders(),
        UsersAPI.addresses(),
        UsersAPI.bonuses()
      ]);
      setOrders(myOrders);
      setAddresses(myAddresses);
      setBonuses(myBonuses);
      if (selectedOrderId && !myOrders.some((order) => String(order.order_id) === String(selectedOrderId))) {
        setSelectedOrderId("");
        setSelectedOrder(null);
      }
    } catch (nextError) {
      setError(nextError?.message || "Ошибка загрузки кабинета");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderDetails(orderId) {
    try {
      setOrderLoading(true);
      setReviewMessage("");
      setSelectedOrderId(orderId);
      setSelectedOrder(null);
      const details = await OrdersAPI.myOrder(orderId);
      setSelectedOrder(details);
      setReviewDraft({
        rating: details.review?.rating || 5,
        comment: details.review?.comment || ""
      });
    } catch (nextError) {
      setError(nextError?.message || "Не удалось загрузить детали заказа");
    } finally {
      setOrderLoading(false);
    }
  }

  function hideOrderDetails() {
    setSelectedOrderId("");
    setSelectedOrder(null);
    setOrderLoading(false);
    setReviewMessage("");
  }

  useEffect(() => {
    if (isAuthed) loadAll();
  }, [isAuthed]);

  async function handleAddAddress(event) {
    event.preventDefault();
    try {
      await UsersAPI.createAddress(newAddress);
      setNewAddress({ label: "Дом", address: "", comment: "", is_default: false });
      await loadAll();
    } catch (nextError) {
      setError(nextError?.message || "Не удалось добавить адрес");
    }
  }

  async function setDefaultAddress(address) {
    try {
      await UsersAPI.updateAddress(address.id, { is_default: true });
      await loadAll();
    } catch (nextError) {
      setError(nextError?.message || "Не удалось обновить адрес");
    }
  }

  async function removeAddress(address) {
    try {
      await UsersAPI.deleteAddress(address.id);
      await loadAll();
    } catch (nextError) {
      setError(nextError?.message || "Не удалось удалить адрес");
    }
  }

  async function saveReview() {
    if (!selectedOrderId) return;
    try {
      setReviewSaving(true);
      setReviewMessage("");
      const review = await OrdersAPI.saveReview(selectedOrderId, reviewDraft);
      setSelectedOrder((prev) => (prev ? { ...prev, review } : prev));
      setReviewDraft({ rating: review.rating, comment: review.comment || "" });
      setReviewMessage("Отзыв сохранен.");
    } catch (nextError) {
      setReviewMessage(nextError?.message || "Не удалось сохранить отзыв");
    } finally {
      setReviewSaving(false);
    }
  }

  function handleLogout() {
    logout();
    nav("/login", { replace: true, state: { from: "/account" } });
  }

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Личный кабинет</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Для доступа к кабинету нужно войти.
        </p>
        <Link
          to="/login"
          state={{ from: "/account" }}
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Личный кабинет</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Вы вошли как: <span className="font-semibold text-foreground">{user?.email}</span>
        </p>
        {error ? (
          <div className="mt-3 rounded-xl border bg-background p-3 text-sm text-primary">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-background p-4">
          <div className="text-sm font-semibold">История заказов</div>
          {loading ? (
            <div className="mt-1 text-xs text-muted-foreground">Загрузка...</div>
          ) : ordersCount === 0 ? (
            <div className="mt-1 text-xs text-muted-foreground">Пока нет заказов</div>
          ) : (
            <div className="mt-2 space-y-2">
              {orders.slice(0, 6).map((order) => (
                <div key={order.order_id} className="rounded-lg border p-2 text-xs">
                  <div className="font-medium">{String(order.order_id).slice(0, 8)}...</div>
                  <div className="text-muted-foreground">
                    {order.status} • {formatRUB(order.total)}
                  </div>
                  <div className="text-muted-foreground">{formatDate(order.created_at)}</div>
                  {order.scheduled_for ? (
                    <div className="text-muted-foreground">
                      Доставка: {formatDate(order.scheduled_for)}
                    </div>
                  ) : null}
                  {order.promo_code ? (
                    <div className="text-muted-foreground">
                      Промокод: {order.promo_code}
                    </div>
                  ) : null}
                  <button
                    className="mt-2 rounded border px-2 py-1"
                    onClick={() => loadOrderDetails(String(order.order_id))}
                  >
                    Подробнее
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4 md:col-span-1">
          <div className="text-sm font-semibold">Адреса</div>
          {loading ? (
            <div className="mt-1 text-xs text-muted-foreground">Загрузка...</div>
          ) : (
            <>
              <div className="mt-2 space-y-2">
                {addresses.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Нет сохраненных адресов</div>
                ) : (
                  addresses.map((address) => (
                    <div key={address.id} className="rounded-lg border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{address.label}</span>
                        {address.is_default ? (
                          <span className="rounded bg-accent px-2 py-0.5">Основной</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-muted-foreground">{address.address}</div>
                      {address.comment ? (
                        <div className="text-muted-foreground">{address.comment}</div>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        {!address.is_default ? (
                          <button
                            className="rounded border px-2 py-1"
                            onClick={() => setDefaultAddress(address)}
                          >
                            Сделать основным
                          </button>
                        ) : null}
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => removeAddress(address)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddAddress} className="mt-3 space-y-2">
                <input
                  className="w-full rounded border px-2 py-1 text-xs"
                  placeholder="Метка (Дом/Офис)"
                  value={newAddress.label}
                  onChange={(event) =>
                    setNewAddress((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded border px-2 py-1 text-xs"
                  placeholder="Адрес"
                  value={newAddress.address}
                  onChange={(event) =>
                    setNewAddress((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded border px-2 py-1 text-xs"
                  placeholder="Комментарий"
                  value={newAddress.comment}
                  onChange={(event) =>
                    setNewAddress((prev) => ({ ...prev, comment: event.target.value }))
                  }
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={newAddress.is_default}
                    onChange={(event) =>
                      setNewAddress((prev) => ({
                        ...prev,
                        is_default: event.target.checked
                      }))
                    }
                  />
                  Сделать адресом по умолчанию
                </label>
                <button className="w-full rounded bg-primary px-3 py-2 text-xs text-primary-foreground">
                  Добавить адрес
                </button>
              </form>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4">
          <div className="text-sm font-semibold">Бонусы</div>
          {loading ? (
            <div className="mt-1 text-xs text-muted-foreground">Загрузка...</div>
          ) : (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Баланс</span>
                <span className="font-semibold">{bonuses.balance}</span>
              </div>
              <div className="flex justify-between">
                <span>Начислено</span>
                <span>{bonuses.accrued}</span>
              </div>
              <div className="flex justify-between">
                <span>Списано</span>
                <span>{bonuses.spent}</span>
              </div>
              <div className="pt-1 text-muted-foreground">
                Начисление: 5% от завершенных заказов.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/menu"
          className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Перейти в меню
        </Link>
        <button
          onClick={loadAll}
          className="rounded-xl border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          Обновить
        </button>
        <button
          onClick={handleLogout}
          className="rounded-xl border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          Выйти
        </button>
      </div>

      {(selectedOrderId || orderLoading) && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={hideOrderDetails} />
          <div className="absolute left-1/2 top-1/2 w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Детали заказа</h2>
              <button
                type="button"
                onClick={hideOrderDetails}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                Скрыть
              </button>
            </div>

            {orderLoading ? (
              <div className="mt-4 text-sm text-muted-foreground">
                Загрузка деталей заказа...
              </div>
            ) : selectedOrder ? (
              <div className="mt-4 text-sm">
                <div className="font-semibold">
                  Заказ {String(selectedOrder.order_id).slice(0, 8)}...
                </div>
                <div className="mt-1 text-muted-foreground">
                  Статус: {selectedOrder.status}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Создан: {formatDate(selectedOrder.created_at)}
                </div>
                {selectedOrder.scheduled_for ? (
                  <div className="mt-1 text-muted-foreground">
                    Запланированная доставка: {formatDate(selectedOrder.scheduled_for)}
                  </div>
                ) : null}

                <div className="mt-3 space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={`${item.pizza_id}-${index}`} className="rounded-lg border p-3">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-muted-foreground">
                        size: {item.size_id} • qty: {item.qty}
                      </div>
                      {item.toppings?.length ? (
                        <div className="text-muted-foreground">
                          Добавки: {item.toppings.join(", ")}
                        </div>
                      ) : null}
                      <div className="text-muted-foreground">
                        {formatRUB(item.unit_price * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t pt-3 text-muted-foreground">
                  <div>
                    Подытог: {formatRUB(selectedOrder.subtotal_before_discount)}
                  </div>
                  <div>
                    Комбо-скидка:{" "}
                    {selectedOrder.combo_discount
                      ? `- ${formatRUB(selectedOrder.combo_discount)}`
                      : "нет"}
                  </div>
                  <div>
                    Промокод:{" "}
                    {selectedOrder.promo_code
                      ? `${selectedOrder.promo_code} (- ${formatRUB(selectedOrder.promo_discount)})`
                      : "нет"}
                  </div>
                  <div>
                    Доставка:{" "}
                    {selectedOrder.delivery_price === 0
                      ? "Бесплатно"
                      : formatRUB(selectedOrder.delivery_price)}
                  </div>
                  <div>
                    Бонусы:{" "}
                    {selectedOrder.bonus_spent
                      ? `- ${formatRUB(selectedOrder.bonus_spent)}`
                      : "нет"}
                  </div>
                  <div className="font-semibold text-foreground">
                    Итого: {formatRUB(selectedOrder.total)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Отзыв по заказу</div>
                    {selectedOrder.review ? (
                      <div className="text-xs text-muted-foreground">
                        Сохранен: {formatDate(selectedOrder.review.created_at)}
                      </div>
                    ) : null}
                  </div>

                  {selectedOrder.status !== "done" ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Оставить отзыв можно после перевода заказа в статус `done`.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() =>
                              setReviewDraft((prev) => ({ ...prev, rating }))
                            }
                            className={[
                              "rounded-lg border px-3 py-1.5 text-sm",
                              reviewDraft.rating === rating
                                ? "bg-accent text-accent-foreground"
                                : "bg-card hover:bg-accent"
                            ].join(" ")}
                          >
                            {rating} / 5
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={reviewDraft.comment}
                        onChange={(event) =>
                          setReviewDraft((prev) => ({
                            ...prev,
                            comment: event.target.value
                          }))
                        }
                        rows={4}
                        className="w-full rounded-xl border bg-card px-3 py-2"
                        placeholder="Что понравилось, что можно улучшить?"
                      />

                      {reviewMessage ? (
                        <div className="rounded-lg border bg-card p-2 text-xs text-primary">
                          {reviewMessage}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={reviewSaving}
                        onClick={saveReview}
                        className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        {reviewSaving ? "Сохраняю..." : "Сохранить отзыв"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">Заказ не найден.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
