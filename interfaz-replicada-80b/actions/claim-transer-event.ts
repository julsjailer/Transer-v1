import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Claim an active event reward once and update inventory or Zeny atomically.",
  schema: z.object({ eventId: z.string().uuid() }),
  run: async ({ eventId }) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const now = new Date().toISOString();
    return db.transaction(async (tx) => {
      const [event] = await tx.select().from(schema.transerEvents).where(eq(schema.transerEvents.id, eventId)).for("update").limit(1);
      if (!event || event.startsAt > now || event.endsAt <= now) fail("El evento no está activo.", { statusCode: 409, errorCode: "event_inactive" });
      const [claim] = await tx.insert(schema.transerEventClaims).values({ id: crypto.randomUUID(), eventId, ownerEmail, claimedAt: now }).onConflictDoNothing().returning({ id: schema.transerEventClaims.id });
      if (!claim) fail("Ya reclamaste la recompensa de este evento.", { statusCode: 409, errorCode: "event_already_claimed" });
      if (event.rewardType === "card") {
        const cardKey = event.rewardKey;
        if (!cardKey || !CARTA_POR_CLAVE.has(cardKey)) fail("La carta de recompensa ya no está disponible.", { statusCode: 409, errorCode: "event_reward_unavailable" });
        const card = CARTA_POR_CLAVE.get(cardKey)!;
        if (card.clase === "giga") {
          const [authorized] = await tx.select({ eventId: schema.transerEventCards.eventId }).from(schema.transerEventCards).where(and(eq(schema.transerEventCards.eventId, eventId), eq(schema.transerEventCards.cardKey, cardKey))).limit(1);
          if (!authorized) fail("La carta GIGA no está autorizada para este evento.", { statusCode: 403, errorCode: "giga_event_required" });
        }
        await tx.insert(schema.bcardInventory).values({ id: crypto.randomUUID(), ownerEmail, cardKey, quantity: event.rewardQuantity, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [schema.bcardInventory.ownerEmail, schema.bcardInventory.cardKey], set: { quantity: sql`${schema.bcardInventory.quantity} + excluded.quantity`, updatedAt: now } });
        await tx.insert(schema.bcardRewardEvents).values({ id: crypto.randomUUID(), ownerEmail, sourceType: "event", sourceKey: eventId, cardKey, quantity: event.rewardQuantity, createdAt: now });
      } else if (event.rewardType === "item") {
        if (!event.rewardKey) fail("El objeto de recompensa no está disponible.", { statusCode: 409, errorCode: "event_reward_unavailable" });
        await tx.insert(schema.bcardItems).values({ ownerEmail, itemKey: event.rewardKey, quantity: event.rewardQuantity, updatedAt: now }).onConflictDoUpdate({ target: [schema.bcardItems.ownerEmail, schema.bcardItems.itemKey], set: { quantity: sql`${schema.bcardItems.quantity} + excluded.quantity`, updatedAt: now } });
      } else if (event.rewardType === "zeny") {
        if (event.rewardZeny < 1) fail("La recompensa de Zenys no está configurada.", { statusCode: 409, errorCode: "event_reward_unavailable" });
        await tx.insert(schema.zenyAccounts).values({ ownerEmail, balance: event.rewardZeny, updatedAt: now }).onConflictDoUpdate({ target: schema.zenyAccounts.ownerEmail, set: { balance: sql`${schema.zenyAccounts.balance} + ${event.rewardZeny}`, updatedAt: now } });
        await tx.insert(schema.zenyTransactions).values({ id: crypto.randomUUID(), ownerEmail, amount: event.rewardZeny, source: "event", sourceKey: eventId, createdAt: now });
      }
      return { eventId, rewardType: event.rewardType, rewardKey: event.rewardKey, rewardQuantity: event.rewardQuantity, rewardZeny: event.rewardZeny };
    });
  },
});
