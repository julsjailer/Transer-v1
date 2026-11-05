import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Mark a received Transer message as read without exposing messages owned by another account.",
  schema: z.object({ messageId: z.string().uuid() }),
  run: async ({ messageId }) => {
    const ownerEmail = requireBcardOwner();
    const [message] = await getDb().update(schema.mailMessages).set({ readAt: new Date().toISOString() }).where(and(
      eq(schema.mailMessages.id, messageId),
      eq(schema.mailMessages.recipientEmail, ownerEmail),
    )).returning({ id: schema.mailMessages.id });
    if (!message) fail("El mensaje no existe.", { statusCode: 404, errorCode: "message_not_found" });
    return { messageId, read: true };
  },
});
