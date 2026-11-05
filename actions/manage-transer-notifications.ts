import { defineAction } from "@agent-native/core/action";
import {
  deleteNotification,
  markNotificationRead,
} from "@agent-native/core/notifications";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description:
    "Mark selected Transer notifications as read or delete them for the signed-in user.",
  schema: z.object({
    operation: z.enum(["read", "delete"]),
    ids: z.array(z.string().min(1).max(128)).min(1).max(200),
  }),
  run: async ({ operation, ids }) => {
    const owner = requireBcardOwner();
    const results = await Promise.all(
      ids.map((id) =>
        operation === "read"
          ? markNotificationRead(id, owner)
          : deleteNotification(id, owner),
      ),
    );
    return { operation, updated: results.filter(Boolean).length };
  },
});
