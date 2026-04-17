import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminAPI } from "../api/admin.js";
import { useAuth } from "../context/authContext.jsx";
import { formatRUB } from "../utils/currency.js";

const ORDER_STATUSES = ["created", "confirmed", "cooking", "delivering", "done", "canceled"];

function toInt(value, fallback = 0) {
  const next = Number.parseInt(value, 10);
  return Number.isNaN(next) ? fallback : next;
}

function toFloat(value, fallback = 1) {
  const next = Number.parseFloat(value);
  return Number.isNaN(next) ? fallback : next;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

export default function AdminPage() {
  const { user, isReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [pizzas, setPizzas] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [newPizza, setNewPizza] = useState({
    id: "",
    name: "",
    description: "",
    base_price: 500,
    category: "classic",
    image: "",
    available: true
  });
  const [newTopping, setNewTopping] = useState({
    id: "",
    name: "",
    price: 60,
    available: true
  });
  const [newSize, setNewSize] = useState({ id: "", name: "", multiplier: 1 });
  const [newPromo, setNewPromo] = useState({
    code: "",
    title: "",
    description: "",
    discount_type: "percent",
    discount_value: 10,
    min_order_total: 0,
    active: true
  });

  async function loadAll() {
    setLoading(true);
    setMessage("");
    try {
      const [nextOrders, nextPizzas, nextToppings, nextSizes, nextPromoCodes, nextReviews] =
        await Promise.all([
          AdminAPI.listOrders(),
          AdminAPI.listPizzas(),
          AdminAPI.listToppings(),
          AdminAPI.listSizes(),
          AdminAPI.listPromoCodes(),
          AdminAPI.listReviews()
        ]);
      setOrders(nextOrders);
      setPizzas(nextPizzas);
      setToppings(nextToppings);
      setSizes(nextSizes);
      setPromoCodes(nextPromoCodes);
      setReviews(nextReviews);
    } catch (error) {
      setMessage(error?.message || "Ошибка загрузки админ-данных");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    if (user?.role === "admin") loadAll();
  }, [isReady, user?.role]);

  if (!isReady) {
    return <div className="text-sm text-muted-foreground">Проверка доступа...</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  if (user.role !== "admin") return <Navigate to="/account" replace />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление заказами, каталогом, промокодами и отзывами
        </p>
        {message ? (
          <div className="mt-3 rounded-lg border bg-background p-3 text-sm">{message}</div>
        ) : null}
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Заказы</h2>
        {loading ? (
          <div className="mt-3 text-sm text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="text-sm">
                  <div className="font-medium">{order.order_id}</div>
                  <div className="text-muted-foreground">
                    {order.items_count} поз. • {formatRUB(order.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Создан: {formatDate(order.created_at)}
                  </div>
                  {order.scheduled_for ? (
                    <div className="text-xs text-muted-foreground">
                      Запланирован на {formatDate(order.scheduled_for)}
                    </div>
                  ) : null}
                  {order.promo_code ? (
                    <div className="text-xs text-muted-foreground">
                      Промокод {order.promo_code} • скидка {formatRUB(order.promo_discount)}
                    </div>
                  ) : null}
                </div>
                <select
                  value={order.status}
                  onChange={async (event) => {
                    const nextStatus = event.target.value;
                    await AdminAPI.updateOrderStatus(order.order_id, nextStatus);
                    setOrders((prev) =>
                      prev.map((item) =>
                        item.order_id === order.order_id ? { ...item, status: nextStatus } : item
                      )
                    );
                  }}
                  className="rounded-lg border bg-background px-2 py-1 text-sm"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Промокоды</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="code"
            value={newPromo.code}
            onChange={(event) =>
              setNewPromo((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="title"
            value={newPromo.title}
            onChange={(event) =>
              setNewPromo((prev) => ({ ...prev, title: event.target.value }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm md:col-span-2"
            placeholder="description"
            value={newPromo.description}
            onChange={(event) =>
              setNewPromo((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <select
            className="rounded border px-2 py-1 text-sm"
            value={newPromo.discount_type}
            onChange={(event) =>
              setNewPromo((prev) => ({ ...prev, discount_type: event.target.value }))
            }
          >
            <option value="percent">percent</option>
            <option value="fixed">fixed</option>
          </select>
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="value"
            value={newPromo.discount_value}
            onChange={(event) =>
              setNewPromo((prev) => ({
                ...prev,
                discount_value: toInt(event.target.value, 0)
              }))
            }
          />
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            onClick={async () => {
              await AdminAPI.createPromoCode(newPromo);
              setNewPromo({
                code: "",
                title: "",
                description: "",
                discount_type: "percent",
                discount_value: 10,
                min_order_total: 0,
                active: true
              });
              await loadAll();
            }}
          >
            Добавить
          </button>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="Минимальная сумма заказа"
            value={newPromo.min_order_total}
            onChange={(event) =>
              setNewPromo((prev) => ({
                ...prev,
                min_order_total: toInt(event.target.value, 0)
              }))
            }
          />
          <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={newPromo.active}
              onChange={(event) =>
                setNewPromo((prev) => ({ ...prev, active: event.target.checked }))
              }
            />
            Активен
          </label>
        </div>

        <div className="mt-3 space-y-2">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-9">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={promo.code}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id
                        ? { ...item, code: event.target.value.toUpperCase() }
                        : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={promo.title}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id ? { ...item, title: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm md:col-span-2"
                value={promo.description || ""}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id
                        ? { ...item, description: event.target.value }
                        : item
                    )
                  )
                }
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                value={promo.discount_type}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id
                        ? { ...item, discount_type: event.target.value }
                        : item
                    )
                  )
                }
              >
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
              <input
                className="rounded border px-2 py-1 text-sm"
                value={promo.discount_value}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id
                        ? {
                            ...item,
                            discount_value: toInt(event.target.value, item.discount_value)
                          }
                        : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={promo.min_order_total}
                onChange={(event) =>
                  setPromoCodes((prev) =>
                    prev.map((item) =>
                      item.id === promo.id
                        ? {
                            ...item,
                            min_order_total: toInt(event.target.value, item.min_order_total)
                          }
                        : item
                    )
                  )
                }
              />
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.updatePromoCode(promo.id, promo);
                  await loadAll();
                }}
              >
                Сохранить
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.deletePromoCode(promo.id);
                  await loadAll();
                }}
              >
                Отключить
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Отзывы</h2>
        {loading ? (
          <div className="mt-3 text-sm text-muted-foreground">Загрузка...</div>
        ) : reviews.length === 0 ? (
          <div className="mt-3 text-sm text-muted-foreground">Пока нет отзывов.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  Заказ {String(review.order_id).slice(0, 8)}... • {review.rating}/5
                </div>
                <div className="text-xs text-muted-foreground">
                  {review.user_name} ({review.user_email})
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </div>
                <div className="mt-2">
                  {review.comment ? review.comment : "Комментарий не добавлен."}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Пиццы</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="id"
            value={newPizza.id}
            onChange={(event) => setNewPizza((prev) => ({ ...prev, id: event.target.value }))}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="name"
            value={newPizza.name}
            onChange={(event) => setNewPizza((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded border px-2 py-1 text-sm md:col-span-2"
            placeholder="description"
            value={newPizza.description}
            onChange={(event) =>
              setNewPizza((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="price"
            value={newPizza.base_price}
            onChange={(event) =>
              setNewPizza((prev) => ({
                ...prev,
                base_price: toInt(event.target.value, 0)
              }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="category"
            value={newPizza.category}
            onChange={(event) =>
              setNewPizza((prev) => ({ ...prev, category: event.target.value }))
            }
          />
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            onClick={async () => {
              await AdminAPI.createPizza(newPizza);
              setNewPizza({
                id: "",
                name: "",
                description: "",
                base_price: 500,
                category: "classic",
                image: "",
                available: true
              });
              await loadAll();
            }}
          >
            Добавить
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {pizzas.map((pizza) => (
            <div key={pizza.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-8">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={pizza.id}
                onChange={(event) =>
                  setPizzas((prev) =>
                    prev.map((item) =>
                      item.id === pizza.id ? { ...item, id: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={pizza.name}
                onChange={(event) =>
                  setPizzas((prev) =>
                    prev.map((item) =>
                      item.id === pizza.id ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm md:col-span-2"
                value={pizza.description}
                onChange={(event) =>
                  setPizzas((prev) =>
                    prev.map((item) =>
                      item.id === pizza.id
                        ? { ...item, description: event.target.value }
                        : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={pizza.base_price}
                onChange={(event) =>
                  setPizzas((prev) =>
                    prev.map((item) =>
                      item.id === pizza.id
                        ? {
                            ...item,
                            base_price: toInt(event.target.value, item.base_price)
                          }
                        : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={pizza.category}
                onChange={(event) =>
                  setPizzas((prev) =>
                    prev.map((item) =>
                      item.id === pizza.id ? { ...item, category: event.target.value } : item
                    )
                  )
                }
              />
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.updatePizza(pizza.id, pizza);
                  await loadAll();
                }}
              >
                Сохранить
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.deletePizza(pizza.id);
                  await loadAll();
                }}
              >
                Скрыть
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Топпинги</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="id"
            value={newTopping.id}
            onChange={(event) =>
              setNewTopping((prev) => ({ ...prev, id: event.target.value }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="name"
            value={newTopping.name}
            onChange={(event) =>
              setNewTopping((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="price"
            value={newTopping.price}
            onChange={(event) =>
              setNewTopping((prev) => ({ ...prev, price: toInt(event.target.value, 0) }))
            }
          />
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            onClick={async () => {
              await AdminAPI.createTopping(newTopping);
              setNewTopping({ id: "", name: "", price: 60, available: true });
              await loadAll();
            }}
          >
            Добавить
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {toppings.map((topping) => (
            <div key={topping.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={topping.id}
                onChange={(event) =>
                  setToppings((prev) =>
                    prev.map((item) =>
                      item.id === topping.id ? { ...item, id: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={topping.name}
                onChange={(event) =>
                  setToppings((prev) =>
                    prev.map((item) =>
                      item.id === topping.id ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={topping.price}
                onChange={(event) =>
                  setToppings((prev) =>
                    prev.map((item) =>
                      item.id === topping.id
                        ? { ...item, price: toInt(event.target.value, item.price) }
                        : item
                    )
                  )
                }
              />
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.updateTopping(topping.id, topping);
                  await loadAll();
                }}
              >
                Сохранить
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.deleteTopping(topping.id);
                  await loadAll();
                }}
              >
                Скрыть
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Размеры</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="id"
            value={newSize.id}
            onChange={(event) => setNewSize((prev) => ({ ...prev, id: event.target.value }))}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="name"
            value={newSize.name}
            onChange={(event) =>
              setNewSize((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="multiplier"
            value={newSize.multiplier}
            onChange={(event) =>
              setNewSize((prev) => ({
                ...prev,
                multiplier: toFloat(event.target.value, 1)
              }))
            }
          />
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            onClick={async () => {
              await AdminAPI.createSize(newSize);
              setNewSize({ id: "", name: "", multiplier: 1 });
              await loadAll();
            }}
          >
            Добавить
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {sizes.map((size) => (
            <div key={size.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={size.id}
                onChange={(event) =>
                  setSizes((prev) =>
                    prev.map((item) =>
                      item.id === size.id ? { ...item, id: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={size.name}
                onChange={(event) =>
                  setSizes((prev) =>
                    prev.map((item) =>
                      item.id === size.id ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={size.multiplier}
                onChange={(event) =>
                  setSizes((prev) =>
                    prev.map((item) =>
                      item.id === size.id
                        ? { ...item, multiplier: toFloat(event.target.value, item.multiplier) }
                        : item
                    )
                  )
                }
              />
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  await AdminAPI.updateSize(size.id, size);
                  await loadAll();
                }}
              >
                Сохранить
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
