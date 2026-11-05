import { defineAction } from "@agent-native/core/action";
import { desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Read only the signed-in user's received and sent Transer mail, including gift attachments.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const messages = await db.select().from(schema.mailMessages).where(or(
      eq(schema.mailMessages.senderEmail, ownerEmail),
      eq(schema.mailMessages.recipientEmail, ownerEmail),
    )).orderBy(desc(schema.mailMessages.createdAt)).limit(200);
    if (!messages.length) return { inbox: [], outbox: [] };
    const ids = messages.map((message) => message.id);
    const accountEmails = [...new Set(messages.flatMap((message) => [message.senderEmail, message.recipientEmail]))];
    const [attachments, profiles] = await Promise.all([
      db.select().from(schema.mailAttachments).where(inArray(schema.mailAttachments.messageId, ids)),
      db.select({ ownerEmail: schema.transerProfiles.ownerEmail, username: schema.transerProfiles.username, displayName: schema.transerProfiles.displayName }).from(schema.transerProfiles).where(inArray(schema.transerProfiles.ownerEmail, accountEmails)),
    ]);
    const profileMap = new Map(profiles.map((profile) => [profile.ownerEmail, profile]));
    const normalized = messages.map((message) => ({
      id: message.id,
      from: profileMap.get(message.senderEmail)?.displayName ?? "Transer user",
      fromUsername: profileMap.get(message.senderEmail)?.username ?? "",
      to: profileMap.get(message.recipientEmail)?.displayName ?? "Transer user",
      toUsername: profileMap.get(message.recipientEmail)?.username ?? "",
      subject: message.subject,
      body: message.body,
      createdAt: message.createdAt,
      read: message.readAt !== null,
      attachments: attachments.filter((attachment) => attachment.messageId === message.id).map((attachment) => ({
        type: attachment.attachmentType,
        key: attachment.referenceKey,
        quantity: attachment.quantity,
        imageData: attachment.imageData,
        card: attachment.attachmentType === "card" && attachment.referenceKey ? CARTA_POR_CLAVE.get(attachment.referenceKey) ?? null : null,
      })),
    }));
    return {
      inbox: normalized.filter((message) => messages.find((row) => row.id === message.id)?.recipientEmail === ownerEmail),
      outbox: normalized.filter((message) => messages.find((row) => row.id === message.id)?.senderEmail === ownerEmail),
    };
  },
});
