import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardCard, requireBcardOwner } from "../server/bcard.js";

const DAILY_SCAN_LIMIT = 5;
const SCAN_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const MONTHLY_MEGA_LIMIT = 3;

export default defineAction({
  description: "Record a rate-limited Cardex scan and add its first discovery to the signed-in user's collection.",
  schema: z.object({ cardKey: z.string().min(1), source: z.enum(["qr", "image", "search"]) }),
  run: async ({ cardKey, source }) => {
    const ownerEmail = requireBcardOwner();
    const card = requireBcardCard(cardKey);
    const db = getDb();
    const now = new Date();
    const nowAt = now.getTime();
    const nowIso = now.toISOString();
    const dayKey = nowIso.slice(0, 10);
    const monthKey = nowIso.slice(0, 7);

    return db.transaction(async (tx) => {
      if (card.clase === "giga") {
        const [eventCard] = await tx.select({ eventId: schema.transerEventCards.eventId })
          .from(schema.transerEventCards)
          .innerJoin(schema.transerEvents, eq(schema.transerEventCards.eventId, schema.transerEvents.id))
          .where(and(
            eq(schema.transerEventCards.cardKey, cardKey),
            lte(schema.transerEvents.startsAt, nowIso),
            gt(schema.transerEvents.endsAt, nowIso),
          )).limit(1);
        if (!eventCard) fail("Esta carta GIGA solo se puede registrar durante un evento autorizado por el creador.", { statusCode: 403, errorCode: "giga_event_required" });
      }

      await tx.insert(schema.bcardScanUsage).values({
        ownerEmail,
        dayKey,
        dailyScans: 0,
        lastScannedAt: null,
        megaMonthKey: monthKey,
        monthlyMegaScans: 0,
      }).onConflictDoNothing();
      const [usage] = await tx.select().from(schema.bcardScanUsage)
        .where(eq(schema.bcardScanUsage.ownerEmail, ownerEmail))
        .for("update").limit(1);
      if (!usage) fail("No se pudo validar el límite de escaneo.", { statusCode: 500, errorCode: "scan_limit_unavailable" });

      const dailyScans = usage.dayKey === dayKey ? usage.dailyScans : 0;
      const monthlyMegaScans = usage.megaMonthKey === monthKey ? usage.monthlyMegaScans : 0;
      if (usage.lastScannedAt && nowAt - Date.parse(usage.lastScannedAt) < SCAN_COOLDOWN_MS) {
        const nextScanAt = new Date(Date.parse(usage.lastScannedAt) + SCAN_COOLDOWN_MS).toISOString();
        fail("Debes esperar 4 horas entre escaneos.", { statusCode: 429, errorCode: "scan_cooldown", details: { nextScanAt } });
      }
      if (dailyScans >= DAILY_SCAN_LIMIT) {
        fail("Alcanzaste el máximo de 5 escaneos de hoy.", { statusCode: 429, errorCode: "daily_scan_limit" });
      }
      if (card.clase === "mega" && monthlyMegaScans >= MONTHLY_MEGA_LIMIT) {
        fail("Ya registraste las 3 cartas MEGA permitidas este mes.", { statusCode: 429, errorCode: "monthly_mega_limit" });
      }

      const [discovery] = await tx.insert(schema.bcardDiscoveries).values({
        id: crypto.randomUUID(), ownerEmail, cardKey, source, discoveredAt: nowIso,
      }).onConflictDoNothing().returning({ cardKey: schema.bcardDiscoveries.cardKey });
      if (discovery) {
        await tx.insert(schema.bcardInventory).values({
          id: crypto.randomUUID(), ownerEmail, cardKey, quantity: 1, createdAt: nowIso, updatedAt: nowIso,
        }).onConflictDoNothing();
      }
      await tx.update(schema.bcardScanUsage).set({
        dayKey,
        dailyScans: dailyScans + 1,
        lastScannedAt: nowIso,
        megaMonthKey: monthKey,
        monthlyMegaScans: monthlyMegaScans + Number(card.clase === "mega"),
      }).where(eq(schema.bcardScanUsage.ownerEmail, ownerEmail));

      return {
        cardKey,
        card,
        discovered: Boolean(discovery),
        inventoryAdded: Boolean(discovery),
        scansRemainingToday: DAILY_SCAN_LIMIT - dailyScans - 1,
        megaScansRemainingThisMonth: card.clase === "mega" ? MONTHLY_MEGA_LIMIT - monthlyMegaScans - 1 : MONTHLY_MEGA_LIMIT - monthlyMegaScans,
        nextScanAt: new Date(nowAt + SCAN_COOLDOWN_MS).toISOString(),
      };
    });
  },
});
