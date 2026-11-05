import { useState } from "react";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { STORE_ITEMS } from "@/lib/bcard-store";
import type { Idioma } from "@/lib/cartas";

export function PanelObjetos({ idioma }: { idioma: Idioma }) {
  const spanish = idioma === "es";
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "usable">("all");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const dashboard = useActionQuery("get-bcard-dashboard", {});
  const useHourglasses = useActionMutation("use-bcard-hourglass");
  const inventory = STORE_ITEMS.map((item) => ({ ...item, quantity: dashboard.data?.items?.find((entry) => entry.itemKey === item.key)?.quantity ?? 0 }))
    .filter((item) => item.name[idioma].toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .filter((item) => selectedFilter === "all" || (item.key === "hourglass" && item.quantity > 0));
  const hourglass = inventory.find((item) => item.key === "hourglass");

  return <section className="space-y-3 rounded border bg-white p-3 text-neutral-900">
    <header><h2 className="font-bold">{spanish ? "OBJETOS" : "ITEMS"}</h2><p className="text-xs text-neutral-600">{spanish ? "Inventario de recursos de tu cuenta" : "Resource inventory for your account"}</p></header>
    <div className="grid grid-cols-[1fr_auto] gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={spanish ? "Buscar objeto…" : "Search items…"} className="min-w-0 rounded border px-2 py-2 text-sm" /><select value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value as typeof selectedFilter)} className="rounded border px-2 text-xs"><option value="all">{spanish ? "Todos" : "All"}</option><option value="usable">{spanish ? "Disponibles" : "Usable"}</option></select></div>
    {notice && <p role="status" className="rounded bg-emerald-50 p-2 text-xs">{notice}</p>}
    <div className="space-y-2">{inventory.map((item) => <article key={item.key} className="flex items-center justify-between gap-2 rounded border p-2"><span className="text-sm font-bold">{item.name[idioma]}</span><span className="rounded bg-neutral-100 px-2 py-1 text-sm">×{item.quantity}</span></article>)}{!inventory.length && <p className="text-sm text-neutral-500">{spanish ? "No hay objetos que coincidan." : "No matching items."}</p>}</div>
    {hourglass && hourglass.quantity > 0 && <div className="space-y-2 border-t pt-3"><label className="block text-xs font-bold">{spanish ? "Usar relojes para acelerar un sobre" : "Use hourglasses to speed up a pack"}<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1 w-full rounded border p-2">{Array.from({ length: Math.min(12, hourglass.quantity) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><button type="button" disabled={useHourglasses.isPending} onClick={() => useHourglasses.mutate({ quantity }, { onSuccess: (result) => { setNotice(`${spanish ? "Relojes usados" : "Hourglasses used"}: ${result.consumed}`); void dashboard.refetch(); }, onError: (error) => setNotice(actionErrorMessage(error) ?? (spanish ? "No se pudo usar el objeto." : "Could not use the item.")) })} className="w-full rounded bg-amber-700 p-2 text-sm font-bold text-white">{spanish ? "Usar" : "Use"}</button></div>}
  </section>;
}
