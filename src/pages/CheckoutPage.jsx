import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useCart } from "../context/cartContext.jsx";
import { OrdersAPI } from "../api/orders.js";
import { UsersAPI } from "../api/users.js";
import { formatRUB } from "../utils/currency.js";

export default function CheckoutPage() {
  const { state, clear, constants } = useCart();
  const { isAuthed, user } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    comment: "",
    payment: "card"
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.name) {
      setForm((p) => ({ ...p, name: p.name || user.name }));
    }
  }, [user?.name]);

  useEffect(() => {
    if (!isAuthed) {
      setSavedAddresses([]);
      setSelectedAddressId("");
      return;
    }

    let mounted = true;
    UsersAPI.addresses()
      .then((list) => {
        if (!mounted) return;
        setSavedAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) {
          setSelectedAddressId(String(def.id));
          setForm((p) => ({
            ...p,
            address: p.address || def.address,
            comment: p.comment || def.comment || ""
          }));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSavedAddresses([]);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  const canSubmit = useMemo(() => {
    if (state.items.length === 0) return false;
    if (form.name.trim().length < 2) return false;
    if (form.phone.trim().length < 6) return false;
    if (form.address.trim().length < 6) return false;
    return true;
  }, [form, state.items.length]);

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr("");
    setLoading(true);

    try {
      const payload = {
        customer: { name: form.name.trim(), phone: form.phone.trim() },
        delivery: { address: form.address.trim(), comment: form.comment.trim() || null },
        payment_method: form.payment,
        items: state.items.map((it) => ({
          pizza_id: it.pizzaId,
          size_id: it.meta?.sizeId || "m",
          toppings: it.meta?.toppingIds || [],
          qty: it.qty
        }))
      };

      const res = await OrdersAPI.createOrder(payload, { auth: true });
      clear();
      nav(`/success?order=${encodeURIComponent(res.order_id)}&token=${encodeURIComponent(res.public_token)}`, {
        replace: true
      });
    } catch (e2) {
      setErr(e2?.message || "Ошибка создания заказа");
    } finally {
      setLoading(false);
    }
  }

  if (state.items.length === 0) {
    return <EmptyState title="Оформлять нечего" desc="Сначала добавь пиццы в корзину." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">Оформление заказа</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAuthed
              ? "Данные профиля и адреса подставляются автоматически."
              : "Можно оформить заказ как гость без регистрации."}
          </p>

          {err ? <div className="mt-3 rounded-xl border bg-background p-3 text-sm text-primary">{err}</div> : null}

          <form onSubmit={submit} className="mt-4 space-y-4">
            {isAuthed && savedAddresses.length > 0 ? (
              <div className="space-y-1">
                <label>Сохраненный адрес</label>
                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAddressId(id);
                    const addr = savedAddresses.find((a) => String(a.id) === id);
                    if (addr) {
                      setForm((p) => ({ ...p, address: addr.address, comment: addr.comment || p.comment }));
                    }
                  }}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                >
                  {savedAddresses.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}: {a.address}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label>Имя</label>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                  placeholder="Например: Артур"
                />
              </div>
              <div className="space-y-1">
                <label>Телефон</label>
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                  placeholder="+7 ..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Адрес</label>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full rounded-xl border bg-input-background px-3 py-2"
                placeholder="Улица, дом, квартира"
              />
            </div>

            <div className="space-y-1">
              <label>Комментарий</label>
              <input
                value={form.comment}
                onChange={(e) => update("comment", e.target.value)}
                className="w-full rounded-xl border bg-input-background px-3 py-2"
                placeholder="Например: домофон не работает"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Оплата</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "card", label: "Картой" },
                  { id: "cash", label: "Наличными" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => update("payment", p.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                      form.payment === p.id ? "bg-accent text-accent-foreground" : "bg-background"
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!canSubmit || loading}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
              type="submit"
            >
              {loading ? "Создаю заказ..." : "Подтвердить заказ"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="text-base font-semibold">Сумма</div>

        <div className="mt-3 space-y-2 text-sm">
          {state.items.map((it) => (
            <div key={it.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate">{it.title}</div>
                <div className="text-xs text-muted-foreground">
                  {it.size} • {it.qty} шт.
                </div>
              </div>
              <div className="shrink-0">{formatRUB(it.unitPrice * it.qty)}</div>
            </div>
          ))}

          <div className="space-y-1 border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Подытог</span>
              <span>{formatRUB(state.subtotalBeforeDiscount)}</span>
            </div>

            {state.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Скидка</span>
                <span className="text-primary">- {formatRUB(state.discount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка</span>
              <span>{state.delivery === 0 ? "Бесплатно" : formatRUB(state.delivery)}</span>
            </div>

            <div className="flex justify-between text-base font-semibold">
              <span>Итого</span>
              <span>{formatRUB(state.total)}</span>
            </div>

            <div className="text-xs text-muted-foreground">Бесплатная доставка от {formatRUB(constants.FREE_DELIVERY_FROM)}.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
