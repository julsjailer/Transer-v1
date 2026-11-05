export const STORE_ITEMS = [
  {
    key: "hourglass",
    name: { es: "Reloj de arena", en: "Hourglass" },
    category: { es: "Aceleradores de Tiempo", en: "Time Accelerators" },
    description: {
      es: "Reduce una hora del tiempo restante de tu sobre.",
      en: "Removes one hour from your pack cooldown.",
    },
  },
  {
    key: "antidote",
    name: { es: "Antídoto", en: "Antidote" },
    category: { es: "Recuperación", en: "Recovery" },
    description: {
      es: "Objeto de recuperación para futuras funciones de estado.",
      en: "A recovery item for future status effects.",
    },
  },
  {
    key: "network-key",
    name: { es: "Llave de red", en: "Network key" },
    category: { es: "Acceso", en: "Access" },
    description: {
      es: "Llave de conexión de la red Transer.",
      en: "A connection key for the Transer network.",
    },
  },
  {
    key: "experience-chip",
    name: { es: "Chip de experiencia", en: "Experience chip" },
    category: { es: "Experiencia", en: "Experience" },
    description: {
      es: "Otorga 25 puntos de experiencia al usarlo.",
      en: "Grants 25 experience points when used.",
    },
  },
] as const;

export type StoreItemKey = (typeof STORE_ITEMS)[number]["key"];
export const STORE_ITEM_BY_KEY = new Map(
  STORE_ITEMS.map((item) => [item.key, item]),
);
export const STORE_ITEM_CATEGORIES = [
  ...new Map(
    STORE_ITEMS.map((item) => [item.category.es, item.category]),
  ).values(),
];
