import { and, eq, sql } from "drizzle-orm";
import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardCard, requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Add an owned card to or remove it from one of the caller's B.Card folders; each folder holds at most 34 different cards.",
  schema: z.object({
    operation: z.enum(["add", "remove"]).describe('Membership operation: "add" or "remove"'),
    folderId: z.string().uuid().describe("Private folder id"),
    cardKey: z.string().min(1).describe("Stable card key from the Transer catalog"),
  }),
  run: async ({ operation, folderId, cardKey }) => {
    const ownerEmail = requireBcardOwner();
    requireBcardCard(cardKey);
    const db = getDb();
    return db.transaction(async (tx) => {
      const [folder] = await tx.select({ id: schema.bcardFolders.id, cardCount: schema.bcardFolders.cardCount })
        .from(schema.bcardFolders)
        .where(and(eq(schema.bcardFolders.id, folderId), eq(schema.bcardFolders.ownerEmail, ownerEmail)))
        .for("update");
      if (!folder) fail("No se encontró esa carpeta.", { statusCode: 404, errorCode: "folder_not_found" });

      if (operation === "add") {
        const [ownedCard] = await tx.select({ id: schema.bcardInventory.id })
          .from(schema.bcardInventory)
          .where(and(eq(schema.bcardInventory.ownerEmail, ownerEmail), eq(schema.bcardInventory.cardKey, cardKey)))
          .limit(1);
        if (!ownedCard) fail("Solo puedes guardar cartas que ya hayas obtenido.", { statusCode: 403, errorCode: "card_not_owned" });
        const [existing] = await tx.select({ id: schema.bcardFolderCards.id })
          .from(schema.bcardFolderCards)
          .where(and(eq(schema.bcardFolderCards.ownerEmail, ownerEmail), eq(schema.bcardFolderCards.folderId, folderId), eq(schema.bcardFolderCards.cardKey, cardKey)))
          .limit(1);
        if (existing) return { folderId, cardKey, changed: false, cardCount: folder.cardCount };
        if (folder.cardCount >= 34) fail("La carpeta ya contiene 34 cartas distintas. Quita una carta o crea otra carpeta.", { errorCode: "folder_full", details: { limit: 34 } });
        const [added] = await tx.insert(schema.bcardFolderCards).values({ id: crypto.randomUUID(), ownerEmail, folderId, cardKey }).onConflictDoNothing().returning({ id: schema.bcardFolderCards.id });
        if (added) {
          await tx.update(schema.bcardFolders).set({ cardCount: sql`${schema.bcardFolders.cardCount} + 1`, updatedAt: new Date().toISOString() }).where(and(eq(schema.bcardFolders.id, folderId), eq(schema.bcardFolders.ownerEmail, ownerEmail)));
        }
        return { folderId, cardKey, changed: Boolean(added), cardCount: folder.cardCount + Number(Boolean(added)) };
      }

      const [removed] = await tx.delete(schema.bcardFolderCards)
        .where(and(eq(schema.bcardFolderCards.ownerEmail, ownerEmail), eq(schema.bcardFolderCards.folderId, folderId), eq(schema.bcardFolderCards.cardKey, cardKey)))
        .returning({ id: schema.bcardFolderCards.id });
      if (removed) {
        await tx.update(schema.bcardFolders).set({ cardCount: sql`greatest(${schema.bcardFolders.cardCount} - 1, 0)`, updatedAt: new Date().toISOString() }).where(and(eq(schema.bcardFolders.id, folderId), eq(schema.bcardFolders.ownerEmail, ownerEmail)));
      }
      return { folderId, cardKey, changed: Boolean(removed), cardCount: Math.max(0, folder.cardCount - Number(Boolean(removed))) };
    });
  },
});
