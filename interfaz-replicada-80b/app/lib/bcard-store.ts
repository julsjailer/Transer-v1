export const STORE_ITEMS = [
  { key: "hourglass", name: { es: "Reloj de arena", en: "Hourglass" } },
  { key: "antidote", name: { es: "Antídoto", en: "Antidote" } },
  { key: "network-key", name: { es: "Llave de red", en: "Network key" } },
] as const;

export type StoreItemKey = (typeof STORE_ITEMS)[number]["key"];
export const STORE_ITEM_BY_KEY = new Map(STORE_ITEMS.map((item) => [item.key, item]));
