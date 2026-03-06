import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminAPI } from "../api/admin.js";
import { useAuth } from "../context/authContext.jsx";
import { formatRUB } from "../utils/currency.js";

const ORDER_STATUSES = ["created", "confirmed", "cooking", "delivering", "done", "canceled"];

function toInt(v, fallback = 0) {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function toFloat(v, fallback = 1) {
  const n = Number.parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

export default function AdminPage() {
  const { user, isReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [pizzas, setPizzas] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sizes, setSizes] = useState([]);

  const [newPizza, setNewPizza] = useState({
    id: "",
    name: "",
    description: "",
    base_price: 500,
    category: "classic",
    image: "",
    available: true
  });
  const [newTopping, setNewTopping] = useState({ id: "", name: "", price: 60, available: true });
  const [newSize, setNewSize] = useState({ id: "", name: "", multiplier: 1 });

  async function loadAll() {
    setLoading(true);
    try {
      const [o, p, t, s] = await Promise.all([
        AdminAPI.listOrders(),
        AdminAPI.listPizzas(),
        AdminAPI.listToppings(),
        AdminAPI.listSizes()
      ]);
      setOrders(o);
      setPizzas(p);
      setToppings(t);
      setSizes(s);
    } catch (e) {
      setMessage(e?.message || "Ошибка загрузки админ-данных");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    if (user?.role === "admin") loadAll();
  }, [isReady, user?.role]);

  if (!isReady) return <div className="text-sm text-muted-foreground">Проверка доступа...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  if (user.role !== "admin") return <Navigate to="/account" replace />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <p className="mt-1 text-sm text-muted-foreground">Управление меню и заказами</p>
        {message ? <div className="mt-3 rounded-lg border bg-background p-3 text-sm">{message}</div> : null}
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Заказы</h2>
        {loading ? (
          <div className="mt-3 text-sm text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <div key={o.order_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="text-sm">
                  <div className="font-medium">{o.order_id}</div>
                  <div className="text-muted-foreground">{o.items_count} поз. • {formatRUB(o.total)}</div>
                </div>
                <select
                  value={o.status}
                  onChange={async (e) => {
                    const next = e.target.value;
                    await AdminAPI.updateOrderStatus(o.order_id, next);
                    setOrders((prev) => prev.map((x) => (x.order_id === o.order_id ? { ...x, status: next } : x)));
                  }}
                  className="rounded-lg border bg-background px-2 py-1 text-sm"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Пиццы</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          <input className="rounded border px-2 py-1 text-sm" placeholder="id" value={newPizza.id} onChange={(e) => setNewPizza((p) => ({ ...p, id: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="name" value={newPizza.name} onChange={(e) => setNewPizza((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm md:col-span-2" placeholder="description" value={newPizza.description} onChange={(e) => setNewPizza((p) => ({ ...p, description: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="price" value={newPizza.base_price} onChange={(e) => setNewPizza((p) => ({ ...p, base_price: toInt(e.target.value, 0) }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="category" value={newPizza.category} onChange={(e) => setNewPizza((p) => ({ ...p, category: e.target.value }))} />
          <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={async () => { await AdminAPI.createPizza(newPizza); setNewPizza({ id: "", name: "", description: "", base_price: 500, category: "classic", image: "", available: true }); await loadAll(); }}>Добавить</button>
        </div>
        <div className="mt-3 space-y-2">
          {pizzas.map((p) => (
            <div key={p.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-8">
              <input className="rounded border px-2 py-1 text-sm" value={p.id} onChange={(e) => setPizzas((x) => x.map((i) => (i.id === p.id ? { ...i, id: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={p.name} onChange={(e) => setPizzas((x) => x.map((i) => (i.id === p.id ? { ...i, name: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm md:col-span-2" value={p.description} onChange={(e) => setPizzas((x) => x.map((i) => (i.id === p.id ? { ...i, description: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={p.base_price} onChange={(e) => setPizzas((x) => x.map((i) => (i.id === p.id ? { ...i, base_price: toInt(e.target.value, i.base_price) } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={p.category} onChange={(e) => setPizzas((x) => x.map((i) => (i.id === p.id ? { ...i, category: e.target.value } : i)))} />
              <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await AdminAPI.updatePizza(p.id, p); await loadAll(); }}>Сохранить</button>
              <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await AdminAPI.deletePizza(p.id); await loadAll(); }}>Скрыть</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Топпинги</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border px-2 py-1 text-sm" placeholder="id" value={newTopping.id} onChange={(e) => setNewTopping((t) => ({ ...t, id: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="name" value={newTopping.name} onChange={(e) => setNewTopping((t) => ({ ...t, name: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="price" value={newTopping.price} onChange={(e) => setNewTopping((t) => ({ ...t, price: toInt(e.target.value, 0) }))} />
          <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={async () => { await AdminAPI.createTopping(newTopping); setNewTopping({ id: "", name: "", price: 60, available: true }); await loadAll(); }}>Добавить</button>
        </div>
        <div className="mt-3 space-y-2">
          {toppings.map((t) => (
            <div key={t.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
              <input className="rounded border px-2 py-1 text-sm" value={t.id} onChange={(e) => setToppings((x) => x.map((i) => (i.id === t.id ? { ...i, id: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={t.name} onChange={(e) => setToppings((x) => x.map((i) => (i.id === t.id ? { ...i, name: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={t.price} onChange={(e) => setToppings((x) => x.map((i) => (i.id === t.id ? { ...i, price: toInt(e.target.value, i.price) } : i)))} />
              <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await AdminAPI.updateTopping(t.id, t); await loadAll(); }}>Сохранить</button>
              <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await AdminAPI.deleteTopping(t.id); await loadAll(); }}>Скрыть</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Размеры</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border px-2 py-1 text-sm" placeholder="id" value={newSize.id} onChange={(e) => setNewSize((s) => ({ ...s, id: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="name" value={newSize.name} onChange={(e) => setNewSize((s) => ({ ...s, name: e.target.value }))} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="multiplier" value={newSize.multiplier} onChange={(e) => setNewSize((s) => ({ ...s, multiplier: toFloat(e.target.value, 1) }))} />
          <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={async () => { await AdminAPI.createSize(newSize); setNewSize({ id: "", name: "", multiplier: 1 }); await loadAll(); }}>Добавить</button>
        </div>
        <div className="mt-3 space-y-2">
          {sizes.map((s) => (
            <div key={s.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
              <input className="rounded border px-2 py-1 text-sm" value={s.id} onChange={(e) => setSizes((x) => x.map((i) => (i.id === s.id ? { ...i, id: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={s.name} onChange={(e) => setSizes((x) => x.map((i) => (i.id === s.id ? { ...i, name: e.target.value } : i)))} />
              <input className="rounded border px-2 py-1 text-sm" value={s.multiplier} onChange={(e) => setSizes((x) => x.map((i) => (i.id === s.id ? { ...i, multiplier: toFloat(e.target.value, i.multiplier) } : i)))} />
              <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await AdminAPI.updateSize(s.id, s); await loadAll(); }}>Сохранить</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
