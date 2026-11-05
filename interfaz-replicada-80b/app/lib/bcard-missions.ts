export const BCARD_PACK_COOLDOWN_HOURS = 12;
export const BCARD_PACK_SIZE = 3;
export const BCARD_FOLDER_LIMIT = 34;
export const BCARD_FAVORITE_LIMIT = 6;

const daily = [
  ["open-daily-pack", "packs-today", 1, 1, 1, "Abre tu sobre diario", "Open your daily pack"],
  ["collect-five-copies", "inventory-copies", 5, 1, 2, "Reúne 5 cartas", "Collect 5 cards"],
  ["discover-five-cards", "discoveries-today", 5, 2, 3, "Descubre 5 cartas hoy", "Discover 5 cards today"],
  ["discover-one-card", "discoveries-today", 1, 1, 1, "Descubre una carta", "Discover one card"],
  ["discover-three-cards", "discoveries-today", 3, 1, 2, "Descubre 3 cartas", "Discover 3 cards"],
  ["favorite-one-card", "favorites", 1, 0, 1, "Guarda una favorita", "Set a favorite"],
  ["favorite-three-cards", "favorites", 3, 1, 2, "Completa 3 favoritas", "Fill 3 favorite slots"],
  ["create-a-folder", "folders-today", 1, 0, 1, "Crea una carpeta", "Create a folder"],
  ["organize-a-card", "organized-today", 1, 1, 1, "Organiza una carta", "Organize a card"],
  ["send-a-gift", "gifts-today", 1, 1, 1, "Envía un regalo", "Send a gift"],
  ["redeem-a-code", "redemptions-today", 1, 1, 1, "Canjea un código", "Redeem a code"],
  ["buy-from-store", "purchases-today", 1, 1, 2, "Compra en la tienda", "Buy from the store"],
  ["use-hourglass", "hourglasses-used-today", 1, 1, 1, "Usa un reloj de arena", "Use an hourglass"],
  ["follow-an-account", "follows-today", 1, 1, 1, "Sigue una cuenta", "Follow an account"],
  ["link-a-brother", "brothers", 1, 1, 2, "Vincula un hermano", "Link a brother"],
  ["request-a-friend", "requests-today", 1, 1, 1, "Envía una solicitud de amistad", "Send a friend request"],
] as const;

export const BCARD_MISSIONS = daily.map(([key, progressKey, target, rewardCards, rewardHourglasses, titleEs, titleEn]) => ({
  key,
  cadence: "daily" as const,
  progressKey,
  target,
  rewardCards,
  rewardHourglasses,
  rewardExperience: 10 + target * 2,
  rewardZeny: 0,
  title: { es: titleEs, en: titleEn },
  description: { es: `Completa el objetivo: ${titleEs.toLowerCase()}.`, en: `Complete the objective: ${titleEn.toLowerCase()}.` },
}));

export type BCardMission = (typeof BCARD_MISSIONS)[number];

export function getBcardMissionStartDate(mission: BCardMission, date = new Date()) {
  if (mission.cadence === "daily") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
  if (mission.cadence === "weekly") {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    return start.toISOString();
  }
  return "1970-01-01T00:00:00.000Z";
}

export function getBcardMissionPeriodKey(mission: BCardMission, date = new Date()) {
  if (mission.cadence === "daily") return date.toISOString().slice(0, 10);
  if (mission.cadence === "weekly") {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}
