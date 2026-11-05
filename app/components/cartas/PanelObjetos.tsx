import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";

import { STORE_ITEMS, STORE_ITEM_CATEGORIES } from "@/lib/bcard-store";
import type { Idioma } from "@/lib/cartas";

export function PanelObjetos({ idioma }: { idioma: Idioma }) {
  const spanish = idioma === "es";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const dashboard = useActionQuery("get-bcard-dashboard", {});
  const useHourglasses = useActionMutation("use-bcard-hourglass");
  const useExperienceChips = useActionMutation("use-bcard-experience-chip");
  const inventory = STORE_ITEMS.map((item) => ({
    ...item,
    quantity:
      dashboard.data?.items?.find((entry) => entry.itemKey === item.key)
        ?.quantity ?? 0,
  }))
    .filter((item) =>
      item.name[idioma].toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .filter(
      (item) =>
        selectedCategory === "all" || item.category.es === selectedCategory,
    );

  const useItem = (itemKey: string) => {
    const onSuccess = (data: unknown) => {
      const result = data as { consumed: number; level?: number };
      setNotice(
        `${spanish ? "Objetos usados" : "Items used"}: ${result.consumed}${result.level ? ` · NV ${result.level}` : ""}`,
      );
      void dashboard.refetch();
    };
    const onError = (error: unknown) =>
      setNotice(
        actionErrorMessage(error) ??
          (spanish ? "No se pudo usar el objeto." : "Could not use the item."),
      );
    if (itemKey === "hourglass")
      useHourglasses.mutate({ quantity }, { onSuccess, onError });
    if (itemKey === "experience-chip")
      useExperienceChips.mutate({ quantity }, { onSuccess, onError });
  };

  return (
    <section className="space-y-3 rounded border bg-white p-3 text-neutral-900">
      <header>
        <h2 className="font-bold">{spanish ? "OBJETOS" : "ITEMS"}</h2>
        <p className="text-xs text-neutral-600">
          {spanish
            ? "Inventario de recursos de tu cuenta"
            : "Resource inventory for your account"}
        </p>
      </header>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={spanish ? "Buscar objeto…" : "Search items…"}
        className="w-full rounded border px-2 py-2 text-sm"
      />
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label={spanish ? "Categorías de objetos" : "Item categories"}
      >
        <button
          type="button"
          aria-pressed={selectedCategory === "all"}
          onClick={() => setSelectedCategory("all")}
          className={`min-h-10 flex-none rounded border px-3 py-2 text-xs font-bold ${selectedCategory === "all" ? "bg-[var(--principal)] text-white" : "bg-white"}`}
        >
          {spanish ? "Todos" : "All"}
        </button>
        {STORE_ITEM_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.es}
            aria-pressed={selectedCategory === category.es}
            onClick={() => setSelectedCategory(category.es)}
            className={`min-h-10 flex-none rounded border px-3 py-2 text-xs font-bold ${selectedCategory === category.es ? "bg-[var(--principal)] text-white" : "bg-white"}`}
          >
            {category[idioma]}
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="rounded bg-emerald-50 p-2 text-xs">
          {notice}
        </p>
      )}
      <div className="space-y-2">
        {inventory.map((item) => (
          <article
            key={item.key}
            className="flex items-center gap-3 rounded border p-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                {item.name[idioma]}
              </span>
              <span className="block text-xs text-neutral-600">
                {item.category[idioma]}
              </span>
              <span className="block text-xs">{item.description[idioma]}</span>
            </span>
            <span className="rounded bg-neutral-100 px-2 py-1 text-sm">
              ×{item.quantity}
            </span>
          </article>
        ))}
        {!inventory.length && (
          <p className="text-sm text-neutral-500">
            {spanish ? "No hay objetos que coincidan." : "No matching items."}
          </p>
        )}
      </div>
      {inventory
        .filter(
          (item) =>
            item.quantity > 0 &&
            (item.key === "hourglass" || item.key === "experience-chip"),
        )
        .map((item) => (
          <div key={`use-${item.key}`} className="space-y-2 border-t pt-3">
            <label className="block text-xs font-bold">
              {spanish ? `Usar ${item.name.es}` : `Use ${item.name.en}`}
              <select
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-1 w-full rounded border p-2"
              >
                {Array.from(
                  { length: Math.min(12, item.quantity) },
                  (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ),
                )}
              </select>
            </label>
            <button
              type="button"
              disabled={
                useHourglasses.isPending || useExperienceChips.isPending
              }
              onClick={() => useItem(item.key)}
              className="w-full rounded bg-amber-700 p-2 text-sm font-bold text-white"
            >
              {spanish ? "Usar" : "Use"}
            </button>
          </div>
        ))}
    </section>
  );
}
