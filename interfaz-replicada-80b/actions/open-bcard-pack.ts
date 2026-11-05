import { eq, sql } from "drizzle-orm";
import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { BCARD_PACK_COOLDOWN_HOURS, BCARD_PACK_SIZE } from "../app/lib/bcard-missions";
import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { drawBcardKeys, requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: `Claim one free B.Card pack with ${BCARD_PACK_SIZE} server-selected cards; one claim is allowed per ${BCARD_PACK_COOLDOWN_HOURS} hours.`,
  schema: z.object({}),
  run: async () => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const now = new Date();
    const claimId = crypto.randomUUID();
    const drawnKeys = drawBcardKeys(BCARD_PACK_SIZE);
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(schema.bcardPackClaims)
        .where(eq(schema.bcardPackClaims.ownerEmail, ownerEmail)).for("update");
      if (current && new Date(current.nextClaimAt).getTime() > now.getTime()) {
        fail("El próximo sobre aún no está disponible.", { statusCode: 429, errorCode: "pack_cooldown", details: { nextClaimAt: current.nextClaimAt } });
      }
      if (current) {
        await tx.update(schema.bcardPackClaims).set({
          lastClaimedAt: now.toISOString(),
          nextClaimAt: new Date(now.getTime() + BCARD_PACK_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
        }).where(eq(schema.bcardPackClaims.ownerEmail, ownerEmail));
      } else {
        const [inserted] = await tx.insert(schema.bcardPackClaims).values({
          ownerEmail,
          lastClaimedAt: now.toISOString(),
          nextClaimAt: new Date(now.getTime() + BCARD_PACK_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
        }).onConflictDoNothing().returning({ ownerEmail: schema.bcardPackClaims.ownerEmail });
        if (!inserted) fail("El sobre ya fue reclamado. Inténtalo de nuevo cuando termine la recarga.", { statusCode: 429, errorCode: "pack_cooldown" });
      }
      const existing = await tx.select({ cardKey: schema.bcardInventory.cardKey })
        .from(schema.bcardInventory).where(eq(schema.bcardInventory.ownerEmail, ownerEmail));
      const existingKeys = new Set(existing.map((row) => row.cardKey));
      const quantities = new Map<string, number>();
      for (const key of drawnKeys) quantities.set(key, (quantities.get(key) ?? 0) + 1);
      const cards = [...quantities].map(([cardKey, quantity]) => ({
        cardKey,
        quantity,
        card: CARTA_POR_CLAVE.get(cardKey)!,
        isNew: !existingKeys.has(cardKey),
      }));
      await tx.insert(schema.bcardRewardEvents).values(cards.map(({ cardKey, quantity }) => ({
        id: crypto.randomUUID(), ownerEmail, sourceType: "pack", sourceKey: claimId, cardKey, quantity,
      })));
      await tx.insert(schema.bcardInventory).values(cards.map(({ cardKey, quantity }) => ({
        id: crypto.randomUUID(), ownerEmail, cardKey, quantity,
      }))).onConflictDoUpdate({
        target: [schema.bcardInventory.ownerEmail, schema.bcardInventory.cardKey],
        set: {
          quantity: sql`${schema.bcardInventory.quantity} + excluded.quantity`,
          updatedAt: now.toISOString(),
        },
      });
      return {
        claimId,
        cards,
        newCards: cards.filter((card) => card.isNew),
        repeatedCards: cards.filter((card) => !card.isNew),
        nextClaimAt: new Date(now.getTime() + BCARD_PACK_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString(),
      };
    });
  },
});
