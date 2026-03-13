import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OrdersAPI } from "../api/orders.js";
import { UsersAPI } from "../api/users.js";
import { useAuth } from "../context/authContext.jsx";
import { formatRUB } from "../utils/currency.js";

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("ru-RU");
}

export default function AccountPage() {
  const { user, isAuthed, logout } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [bonuses, setBonuses] = useState({ balance: 0, accrued: 0, spent: 0 });
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [newAddress, setNewAddress] = useState({ label: "Дом", address: "", comment: "", is_default: false });

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
      if (selectedOrderId && !myOrders.some((o) => String(o.order_id) === String(selectedOrderId))) {
        setSelectedOrderId("");
        setSelectedOrder(null);
      }
    } catch (e) {
      setError(e?.message || "Ошибка загрузки кабинета");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderDetails(orderId) {
    try {
      setOrderLoading(true);
      setSelectedOrderId(orderId);
      setSelectedOrder(null);
      const details = await OrdersAPI.myOrder(orderId);
      setSelectedOrder(details);
    } catch (e) {
      setError(e?.message || "Не удалось загрузить детали заказа");
    } finally {
      setOrderLoading(false);
    }
  }

  function hideOrderDetails() {
    setSelectedOrderId("");
    setSelectedOrder(null);
    setOrderLoading(false);
  }

  useEffect(() => {
    if (isAuthed) loadAll();
  }, [isAuthed]);

  async function handleAddAddress(e) {
    e.preventDefault();
    try {
      await UsersAPI.createAddress(newAddress);
      setNewAddress({ label: "Дом", address: "", comment: "", is_default: false });
      await loadAll();
    } catch (e) {
      setError(e?.message || "Не удалось добавить адрес");
    }
  }

  async function setDefaultAddress(addr) {
    try {
      await UsersAPI.updateAddress(addr.id, { is_default: true });
      await loadAll();
    } catch (e) {
      setError(e?.message || "Не удалось обновить адрес");
    }
  }

  async function removeAddress(addr) {
    try {
      await UsersAPI.deleteAddress(addr.id);
      await loadAll();
    } catch (e) {
      setError(e?.message || "Не удалось удалить адрес");
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
        <p className="mt-2 text-sm text-muted-foreground">Для доступа к кабинету нужно войти.</p>
        <Link to="/login" state={{ from: "/account" }} className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">
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
        {error ? <div className="mt-3 rounded-xl border bg-background p-3 text-sm text-primary">{error}</div> : null}
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
              {orders.slice(0, 6).map((o) => (
                <div key={o.order_id} className="rounded-lg border p-2 text-xs">
                  <div className="font-medium">{String(o.order_id).slice(0, 8)}...</div>
                  <div className="text-muted-foreground">{o.status} • {formatRUB(o.total)}</div>
                  <div className="text-muted-foreground">{formatDate(o.created_at)}</div>
                  <button
                    className="mt-2 rounded border px-2 py-1"
                    onClick={() => loadOrderDetails(String(o.order_id))}
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
                  addresses.map((a) => (
                    <div key={a.id} className="rounded-lg border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{a.label}</span>
                        {a.is_default ? <span className="rounded bg-accent px-2 py-0.5">Основной</span> : null}
                      </div>
                      <div className="mt-1 text-muted-foreground">{a.address}</div>
                      {a.comment ? <div className="text-muted-foreground">{a.comment}</div> : null}
                      <div className="mt-2 flex gap-2">
                        {!a.is_default ? (
                          <button className="rounded border px-2 py-1" onClick={() => setDefaultAddress(a)}>Сделать основным</button>
                        ) : null}
                        <button className="rounded border px-2 py-1" onClick={() => removeAddress(a)}>Удалить</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddAddress} className="mt-3 space-y-2">
                <input className="w-full rounded border px-2 py-1 text-xs" placeholder="Метка (Дом/Офис)" value={newAddress.label} onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))} />
                <input className="w-full rounded border px-2 py-1 text-xs" placeholder="Адрес" value={newAddress.address} onChange={(e) => setNewAddress((p) => ({ ...p, address: e.target.value }))} />
                <input className="w-full rounded border px-2 py-1 text-xs" placeholder="Комментарий" value={newAddress.comment} onChange={(e) => setNewAddress((p) => ({ ...p, comment: e.target.value }))} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={newAddress.is_default} onChange={(e) => setNewAddress((p) => ({ ...p, is_default: e.target.checked }))} />
                  Сделать адресом по умолчанию
                </label>
                <button className="w-full rounded bg-primary px-3 py-2 text-xs text-primary-foreground">Добавить адрес</button>
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
              <div className="flex justify-between"><span>Баланс</span><span className="font-semibold">{bonuses.balance}</span></div>
              <div className="flex justify-between"><span>Начислено</span><span>{bonuses.accrued}</span></div>
              <div className="flex justify-between"><span>Списано</span><span>{bonuses.spent}</span></div>
              <div className="pt-1 text-muted-foreground">Начисление: 5% от завершенных заказов.</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/menu" className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Перейти в меню</Link>
        <button onClick={loadAll} className="rounded-xl border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Обновить</button>
        <button onClick={handleLogout} className="rounded-xl border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Выйти</button>
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
              <div className="mt-4 text-sm text-muted-foreground">Загрузка деталей заказа...</div>
            ) : selectedOrder ? (
              <div className="mt-4 text-sm">
                <div className="font-semibold">Заказ {String(selectedOrder.order_id).slice(0, 8)}...</div>
                <div className="mt-1 text-muted-foreground">Статус: {selectedOrder.status}</div>
                <div className="mt-1 text-muted-foreground">Создан: {formatDate(selectedOrder.created_at)}</div>

                <div className="mt-3 space-y-2">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={`${it.pizza_id}-${idx}`} className="rounded-lg border p-3">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-muted-foreground">
                        size: {it.size_id} • qty: {it.qty}
                      </div>
                      {it.toppings?.length ? (
                        <div className="text-muted-foreground">Добавки: {it.toppings.join(", ")}</div>
                      ) : null}
                      <div className="text-muted-foreground">{formatRUB(it.unit_price * it.qty)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t pt-3 text-muted-foreground">
                  <div>Подытог: {formatRUB(selectedOrder.subtotal)}</div>
                  <div>Скидка: {selectedOrder.discount ? `- ${formatRUB(selectedOrder.discount)}` : "нет"}</div>
                  <div>Доставка: {selectedOrder.delivery_price === 0 ? "Бесплатно" : formatRUB(selectedOrder.delivery_price)}</div>
                  <div>Бонусы: {selectedOrder.bonus_spent ? `- ${formatRUB(selectedOrder.bonus_spent)}` : "нет"}</div>
                  <div className="font-semibold text-foreground">Итого: {formatRUB(selectedOrder.total)}</div>
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
