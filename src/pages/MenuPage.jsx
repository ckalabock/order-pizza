import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/cartContext.jsx";
import MenuItemCard from "../components/MenuItemCard.jsx";
import CustomizeModal from "../components/CustomizeModal.jsx";
import { stableKey } from "../utils/id.js";
import { CatalogAPI } from "../api/catalog.js";

const CATS = [
  { id: "all", label: "Все" },
  { id: "classic", label: "Классические" },
  { id: "meat", label: "Мясные" },
  { id: "veg", label: "Вегетарианские" },
  { id: "fish", label: "Рыбные" }
];

export default function MenuPage() {
  const { addItem } = useCart();
  const [activeCat, setActiveCat] = useState("all");
  const [openPizza, setOpenPizza] = useState(null);

  const [pizzas, setPizzas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    CatalogAPI.pizzas({ category: activeCat })
      .then((data) => {
        if (!alive) return;
        setPizzas(data);
      })
      .catch(() => {
        if (!alive) return;
        setPizzas([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeCat]);

  const list = useMemo(() => pizzas, [pizzas]);

  function quickAdd(pizza) {
    const key = stableKey([pizza.id, "m"]);
    addItem({
      key,
      pizzaId: pizza.id,
      title: pizza.name,
      size: "30 см",
      toppings: [],
      unitPrice: Math.round(pizza.base_price * 1.25),
      qty: 1,
      meta: { sizeId: "m", toppingIds: [] }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Меню</h1>
        <p className="mt-1 text-sm text-muted-foreground">Для кастомизации нажми на карточку.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={[
                "rounded-xl border px-4 py-2 text-sm shadow-sm",
                activeCat === c.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-background hover:bg-accent hover:text-accent-foreground"
              ].join(" ")}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">Загружаю меню...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <MenuItemCard
              key={p.id}
              pizza={{
                id: p.id,
                name: p.name,
                description: p.description,
                basePrice: p.base_price,
                image: p.image ? `/${p.image}` : null
              }}
              onQuickAdd={() => quickAdd(p)}
              onOpen={() => setOpenPizza(p)}
            />
          ))}
        </div>
      )}

      {openPizza && (
        <CustomizeModal
          open={!!openPizza}
          pizza={{
            id: openPizza.id,
            name: openPizza.name,
            description: openPizza.description,
            basePrice: openPizza.base_price,
            image: openPizza.image
          }}
          onClose={() => setOpenPizza(null)}
          onAdd={addItem}
        />
      )}
    </div>
  );
}
