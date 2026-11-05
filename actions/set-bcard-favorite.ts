import { and, eq, ne } from "drizzle-orm";
import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardCard, requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Set or clear one of the signed-in user's six B.Card profile favorite slots; the selected card must be owned.",
  schema: z.object({
    slot: z.number().int().min(0).max(5).describe("Favorite slot from 0 to 5"),
    cardKey: z.string().min(1).nullable().describe("Owned card key, or null to clear the slot"),
  }),
  run: async ({ slot, cardKey }) => {
    const ownerEmail = requireBcardOwner();
    if (cardKey) requireBcardCard(cardKey);
    const db = getDb();
    return db.transaction(async (tx) => {
      if (cardKey) {
        const [owned] = await tx.select({ id: schema.bcardInventory.id })
          .from(schema.bcardInventory)
          .where(and(eq(schema.bcardInventory.ownerEmail, ownerEmail), eq(schema.bcardInventory.cardKey, cardKey)))
          .limit(1);
        if (!owned) fail("Solo puedes elegir cartas que ya tengas.", { statusCode: 403, errorCode: "card_not_owned" });
        const [otherSlot] = await tx.select({ slot: schema.bcardFavorites.slot })
          .from(schema.bcardFavorites)
          .where(and(eq(schema.bcardFavorites.ownerEmail, ownerEmail), eq(schema.bcardFavorites.cardKey, cardKey), ne(schema.bcardFavorites.slot, slot)))
          .limit(1);
        if (otherSlot) fail("Esa carta ya está en otro espacio de favoritos.", { errorCode: "favorite_already_selected", details: { slot: otherSlot.slot } });
        const [favorite] = await tx.insert(schema.bcardFavorites)
          .values({ id: crypto.randomUUID(), ownerEmail, slot, cardKey, updatedAt: new Date().toISOString() })
          .onConflictDoUpdate({ target: [schema.bcardFavorites.ownerEmail, schema.bcardFavorites.slot], set: { cardKey, updatedAt: new Date().toISOString() } })
          .returning();
        return favorite;
      }
      const [removed] = await tx.delete(schema.bcardFavorites)
        .where(and(eq(schema.bcardFavorites.ownerEmail, ownerEmail), eq(schema.bcardFavorites.slot, slot)))
        .returning();
      return removed ?? { ownerEmail, slot, cardKey: null };
    });
  },
});
