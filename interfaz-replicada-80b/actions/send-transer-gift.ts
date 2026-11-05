import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardCard, requireBcardOwner } from "../server/bcard.js";

const attachmentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("card"), key: z.string().min(1), quantity: z.number().int().min(1).max(99) }),
  z.object({ type: z.literal("item"), key: z.literal("hourglass"), quantity: z.number().int().min(1).max(99) }),
  z.object({ type: z.literal("image"), data: z.string().max(2_800_000) }),
]);

export default defineAction({
  description: "Send a gift message to a registered Transer user and atomically transfer attached cards or items.",
  schema: z.object({
    toUsername: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/),
    subject: z.string().trim().min(1).max(120),
    body: z.string().max(2000),
    attachments: z.array(attachmentSchema).max(3),
  }),
  run: async ({ toUsername, subject, body, attachments }) => {
    const senderEmail = requireBcardOwner();
    for (const attachment of attachments) {
      if (attachment.type === "image" && !/^data:image\/(png|jpeg|webp);base64,/.test(attachment.data)) fail("La imagen debe ser PNG, JPEG o WebP.", { statusCode: 400, errorCode: "invalid_image" });
      if (attachment.type === "card") requireBcardCard(attachment.key);
    }
    const db = getDb();
    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    return db.transaction(async (tx) => {
      const [recipient] = await tx.select({ ownerEmail: schema.transerProfiles.ownerEmail }).from(schema.transerProfiles)
        .where(eq(schema.transerProfiles.username, toUsername)).limit(1);
      if (!recipient) fail("No encontramos una cuenta registrada con ese nombre de usuario.", { statusCode: 404, errorCode: "recipient_not_found" });
      if (recipient.ownerEmail === senderEmail) fail("No puedes enviarte regalos a tu propia cuenta.", { statusCode: 400, errorCode: "self_gift" });

      for (const attachment of attachments) {
        if (attachment.type === "card") {
          const [owned] = await tx.select().from(schema.bcardInventory).where(and(
            eq(schema.bcardInventory.ownerEmail, senderEmail),
            eq(schema.bcardInventory.cardKey, attachment.key),
          )).for("update");
          if (!owned || owned.quantity < attachment.quantity) fail("No tienes suficientes copias de esa carta.", { statusCode: 409, errorCode: "card_quantity_unavailable" });
          if (owned.quantity === attachment.quantity) {
            const folderRows = await tx.select({ folderId: schema.bcardFolderCards.folderId }).from(schema.bcardFolderCards).where(and(
              eq(schema.bcardFolderCards.ownerEmail, senderEmail), eq(schema.bcardFolderCards.cardKey, attachment.key),
            ));
            await tx.delete(schema.bcardInventory).where(eq(schema.bcardInventory.id, owned.id));
            await tx.delete(schema.bcardFolderCards).where(and(
              eq(schema.bcardFolderCards.ownerEmail, senderEmail), eq(schema.bcardFolderCards.cardKey, attachment.key),
            ));
            for (const row of folderRows) await tx.update(schema.bcardFolders).set({ cardCount: sql`greatest(${schema.bcardFolders.cardCount} - 1, 0)`, updatedAt: now }).where(eq(schema.bcardFolders.id, row.folderId));
            await tx.delete(schema.bcardFavorites).where(and(
              eq(schema.bcardFavorites.ownerEmail, senderEmail), eq(schema.bcardFavorites.cardKey, attachment.key),
            ));
          } else await tx.update(schema.bcardInventory).set({ quantity: owned.quantity - attachment.quantity, updatedAt: now }).where(eq(schema.bcardInventory.id, owned.id));
          await tx.insert(schema.bcardInventory).values({ id: crypto.randomUUID(), ownerEmail: recipient.ownerEmail, cardKey: attachment.key, quantity: attachment.quantity, updatedAt: now }).onConflictDoUpdate({
            target: [schema.bcardInventory.ownerEmail, schema.bcardInventory.cardKey],
            set: { quantity: sql`${schema.bcardInventory.quantity} + excluded.quantity`, updatedAt: now },
          });
        }
        if (attachment.type === "item") {
          const [owned] = await tx.select().from(schema.bcardItems).where(and(
            eq(schema.bcardItems.ownerEmail, senderEmail),
            eq(schema.bcardItems.itemKey, attachment.key),
          )).for("update");
          if (!owned || owned.quantity < attachment.quantity) fail("No tienes suficientes objetos.", { statusCode: 409, errorCode: "item_quantity_unavailable" });
          await tx.update(schema.bcardItems).set({ quantity: owned.quantity - attachment.quantity, updatedAt: now }).where(and(
            eq(schema.bcardItems.ownerEmail, senderEmail), eq(schema.bcardItems.itemKey, attachment.key),
          ));
          await tx.insert(schema.bcardItems).values({ ownerEmail: recipient.ownerEmail, itemKey: attachment.key, quantity: attachment.quantity, updatedAt: now }).onConflictDoUpdate({
            target: [schema.bcardItems.ownerEmail, schema.bcardItems.itemKey],
            set: { quantity: sql`${schema.bcardItems.quantity} + excluded.quantity`, updatedAt: now },
          });
        }
      }

      await tx.insert(schema.mailMessages).values({ id: messageId, senderEmail, recipientEmail: recipient.ownerEmail, subject, body, createdAt: now });
      if (attachments.length) await tx.insert(schema.mailAttachments).values(attachments.map((attachment) => ({
        id: crypto.randomUUID(),
        messageId,
        attachmentType: attachment.type,
        referenceKey: attachment.type === "image" ? null : attachment.key,
        quantity: attachment.type === "image" ? 1 : attachment.quantity,
        imageData: attachment.type === "image" ? attachment.data : null,
      })));
      return { messageId, sentAt: now };
    });
  },
});
