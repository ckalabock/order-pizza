import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import { OrdersAPI } from "../api/orders.js";
import { PromosAPI } from "../api/promos.js";
import { UsersAPI } from "../api/users.js";
import { useAuth } from "../context/authContext.jsx";
import { useCart } from "../context/cartContext.jsx";
import { formatRUB } from "../utils/currency.js";

function toServerDateTime(localValue) {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toLocalInputValue(date) {
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 16);
}

function getScheduleMinValue() {
  return toLocalInputValue(new Date(Date.now() + 30 * 60 * 1000));
}

function formatPromo(promo) {
  if (promo.discount_type === "percent") {
    return `${promo.code} • ${promo.discount_value}%`;
  }
  return `${promo.code} • ${formatRUB(promo.discount_value)}`;
}

export default function CheckoutPage() {
  const { state, clear, constants } = useCart();
  const { isAuthed, user } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    comment: "",
    payment: "card",
    promoCode: "",
    scheduleMode: "asap",
    scheduledFor: ""
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [activePromos, setActivePromos] = useState([]);
  const [bonuses, setBonuses] = useState({ balance: 0, accrued: 0, spent: 0 });
  const [bonusInput, setBonusInput] = useState("0");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [pricing, setPricing] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.name) {
      setForm((prev) => ({ ...prev, name: prev.name || user.name }));
    }
  }, [user?.name]);

  useEffect(() => {
    let mounted = true;
    PromosAPI.listActive()
      .then((list) => {
        if (mounted) setActivePromos(list);
      })
      .catch(() => {
        if (mounted) setActivePromos([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      setSavedAddresses([]);
      setBonuses({ balance: 0, accrued: 0, spent: 0 });
      setBonusInput("0");
      setSelectedAddressId("");
      return;
    }

    let mounted = true;
    Promise.all([UsersAPI.addresses(), UsersAPI.bonuses()])
      .then(([list, bonusStats]) => {
        if (!mounted) return;
        setSavedAddresses(list);
        setBonuses(bonusStats);
        const defaultAddress = list.find((item) => item.is_default) || list[0];
        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.id));
          setForm((prev) => ({
            ...prev,
            address: prev.address || defaultAddress.address,
            comment: prev.comment || defaultAddress.comment || ""
          }));
        }
        setBonusInput("0");
      })
      .catch(() => {
        if (!mounted) return;
        setSavedAddresses([]);
        setBonuses({ balance: 0, accrued: 0, spent: 0 });
      });

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  const fallbackSummary = useMemo(() => {
    const promoCode = form.promoCode.trim().toUpperCase() || null;
    return {
      subtotal_before_discount: Math.round(state.subtotalBeforeDiscount),
      combo_discount: Math.round(state.discount),
      subtotal: Math.round(state.subtotal),
      discount: Math.round(state.discount),
      promo_code: promoCode,
      promo_discount: 0,
      delivery_price: Math.round(state.delivery),
      bonus_spent: 0,
      total_before_bonuses: Math.round(state.total),
      total: Math.round(state.total),
      scheduled_for:
        form.scheduleMode === "scheduled" ? toServerDateTime(form.scheduledFor) : null
    };
  }, [form.promoCode, form.scheduleMode, form.scheduledFor, state]);

  const maxBonusSpend = useMemo(() => {
    if (!isAuthed) return 0;
    return Math.max(
      0,
      Math.min(bonuses.balance || 0, pricing?.total_before_bonuses ?? fallbackSummary.total_before_bonuses)
    );
  }, [bonuses.balance, fallbackSummary.total_before_bonuses, isAuthed, pricing?.total_before_bonuses]);

  const bonusSpent = useMemo(() => {
    const parsed = Number.parseInt(bonusInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, maxBonusSpend);
  }, [bonusInput, maxBonusSpend]);

  const previewPayload = useMemo(
    () => ({
      bonus_spent: bonusSpent,
      promo_code: form.promoCode.trim() || null,
      scheduled_for:
        form.scheduleMode === "scheduled" ? toServerDateTime(form.scheduledFor) : null,
      items: state.items.map((item) => ({
        pizza_id: item.pizzaId,
        size_id: item.meta?.sizeId || "m",
        toppings: item.meta?.toppingIds || [],
        qty: item.qty
      }))
    }),
    [bonusSpent, form.promoCode, form.scheduleMode, form.scheduledFor, state.items]
  );

  const canPreview = useMemo(() => {
    if (state.items.length === 0) return false;
    const promoCode = form.promoCode.trim();
    if (promoCode && promoCode.length < 3) return false;
    if (form.scheduleMode === "scheduled" && !form.scheduledFor) return false;
    return true;
  }, [form.promoCode, form.scheduleMode, form.scheduledFor, state.items.length]);

  useEffect(() => {
    if (!canPreview) {
      setPricing(null);
      setPricingError("");
      setPricingLoading(false);
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      setPricingLoading(true);
      try {
        const nextPricing = await OrdersAPI.previewOrder(previewPayload, { auth: isAuthed });
        if (cancelled) return;
        setPricing(nextPricing);
        setPricingError("");
      } catch (error) {
        if (cancelled) return;
        setPricing(null);
        setPricingError(error?.message || "Не удалось рассчитать стоимость заказа");
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [canPreview, isAuthed, previewPayload]);

  const summary = pricing
    ? pricing
    : {
        ...fallbackSummary,
        bonus_spent: bonusSpent,
        total: Math.max(0, fallbackSummary.total_before_bonuses - bonusSpent)
      };

  const canSubmit = useMemo(() => {
    if (state.items.length === 0) return false;
    if (form.name.trim().length < 2) return false;
    if (form.phone.trim().length < 6) return false;
    if (form.address.trim().length < 6) return false;
    if (form.scheduleMode === "scheduled" && !form.scheduledFor) return false;
    if (pricingError && (form.promoCode.trim() || form.scheduleMode === "scheduled")) return false;
    return true;
  }, [
    form.address,
    form.name,
    form.phone,
    form.promoCode,
    form.scheduleMode,
    form.scheduledFor,
    pricingError,
    state.items.length
  ]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setErr("");
    setLoading(true);

    try {
      const payload = {
        customer: { name: form.name.trim(), phone: form.phone.trim() },
        delivery: { address: form.address.trim(), comment: form.comment.trim() || null },
        payment_method: form.payment,
        bonus_spent: bonusSpent,
        promo_code: form.promoCode.trim() || null,
        scheduled_for:
          form.scheduleMode === "scheduled" ? toServerDateTime(form.scheduledFor) : null,
        items: previewPayload.items
      };

      const response = await OrdersAPI.createOrder(payload, { auth: true });
      clear();
      nav(
        `/success?order=${encodeURIComponent(response.order_id)}&token=${encodeURIComponent(response.public_token)}`,
        {
          replace: true
        }
      );
    } catch (error) {
      setErr(error?.message || "Ошибка создания заказа");
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
            На третьем этапе доступны промокоды, предварительный серверный расчет и
            отложенная доставка.
          </p>

          {err ? (
            <div className="mt-3 rounded-xl border bg-background p-3 text-sm text-primary">
              {err}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-4 space-y-4">
            {isAuthed && savedAddresses.length > 0 ? (
              <div className="space-y-1">
                <label>Сохраненный адрес</label>
                <select
                  value={selectedAddressId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedAddressId(nextId);
                    const address = savedAddresses.find((item) => String(item.id) === nextId);
                    if (address) {
                      setForm((prev) => ({
                        ...prev,
                        address: address.address,
                        comment: address.comment || prev.comment
                      }));
                    }
                  }}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                >
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label}: {address.address}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label>Имя</label>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                  placeholder="Например: Артур"
                />
              </div>
              <div className="space-y-1">
                <label>Телефон</label>
                <input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                  placeholder="+7 ..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Адрес</label>
              <input
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                className="w-full rounded-xl border bg-input-background px-3 py-2"
                placeholder="Улица, дом, квартира"
              />
            </div>

            <div className="space-y-1">
              <label>Комментарий</label>
              <input
                value={form.comment}
                onChange={(event) => update("comment", event.target.value)}
                className="w-full rounded-xl border bg-input-background px-3 py-2"
                placeholder="Например: домофон не работает"
              />
            </div>

            <div className="space-y-2 rounded-xl border bg-background p-3">
              <div className="text-sm font-semibold">Промокод</div>
              <input
                value={form.promoCode}
                onChange={(event) => update("promoCode", event.target.value.toUpperCase())}
                className="w-full rounded-xl border bg-input-background px-3 py-2"
                placeholder="Например: WELCOME10"
              />
              {activePromos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activePromos.map((promo) => (
                    <button
                      key={promo.id}
                      type="button"
                      onClick={() => update("promoCode", promo.code)}
                      className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
                    >
                      {formatPromo(promo)}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Код проверяется на backend по текущему составу корзины.
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-background p-3">
              <div className="text-sm font-semibold">Время доставки</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "asap", label: "Как можно скорее" },
                  { id: "scheduled", label: "Запланировать" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update("scheduleMode", item.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                      form.scheduleMode === item.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-card"
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {form.scheduleMode === "scheduled" ? (
                <input
                  type="datetime-local"
                  min={getScheduleMinValue()}
                  value={form.scheduledFor}
                  onChange={(event) => update("scheduledFor", event.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                />
              ) : (
                <div className="text-xs text-muted-foreground">
                  Система оформит заказ на ближайшее доступное время.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Оплата</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "card", label: "Картой" },
                  { id: "cash", label: "Наличными" }
                ].map((payment) => (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => update("payment", payment.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm hover:bg-accent",
                      form.payment === payment.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-background"
                    ].join(" ")}
                  >
                    {payment.label}
                  </button>
                ))}
              </div>
            </div>

            {isAuthed ? (
              <div className="space-y-2 rounded-xl border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Списать бонусы</div>
                    <div className="text-xs text-muted-foreground">
                      Доступно: {bonuses.balance}. Можно списать до {formatRUB(maxBonusSpend)}.
                    </div>
                  </div>
                  {maxBonusSpend > 0 ? (
                    <button
                      type="button"
                      onClick={() => setBonusInput(String(maxBonusSpend))}
                      className="rounded-lg border bg-background px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Списать максимум
                    </button>
                  ) : null}
                </div>

                <input
                  type="number"
                  min="0"
                  max={String(maxBonusSpend)}
                  step="1"
                  value={bonusInput}
                  onChange={(event) => setBonusInput(event.target.value)}
                  className="w-full rounded-xl border bg-input-background px-3 py-2"
                  placeholder="0"
                />
              </div>
            ) : null}

            {pricingError ? (
              <div className="rounded-xl border bg-background p-3 text-sm text-primary">
                {pricingError}
              </div>
            ) : null}

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
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold">Сумма</div>
          {pricingLoading ? (
            <div className="text-xs text-muted-foreground">Пересчитываю...</div>
          ) : null}
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {state.items.map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.size} • {item.qty} шт.
                </div>
              </div>
              <div className="shrink-0">{formatRUB(item.unitPrice * item.qty)}</div>
            </div>
          ))}

          <div className="space-y-1 border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Подытог</span>
              <span>{formatRUB(summary.subtotal_before_discount)}</span>
            </div>

            {summary.combo_discount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Комбо-скидка</span>
                <span className="text-primary">- {formatRUB(summary.combo_discount)}</span>
              </div>
            ) : null}

            {summary.promo_discount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Промокод {summary.promo_code ? summary.promo_code : ""}
                </span>
                <span className="text-primary">- {formatRUB(summary.promo_discount)}</span>
              </div>
            ) : null}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка</span>
              <span>
                {summary.delivery_price === 0
                  ? "Бесплатно"
                  : formatRUB(summary.delivery_price)}
              </span>
            </div>

            {bonusSpent > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Бонусы</span>
                <span className="text-primary">- {formatRUB(bonusSpent)}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-base font-semibold">
              <span>Итого</span>
              <span>{formatRUB(summary.total)}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Бесплатная доставка от {formatRUB(constants.FREE_DELIVERY_FROM)}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
