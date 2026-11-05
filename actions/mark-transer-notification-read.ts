import { defineAction, fail } from "@agent-native/core/action";
import { markNotificationRead } from "@agent-native/core/notifications";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description:
    "Mark one signed-in user's Transer notification as read by its notification id.",
  schema: z.object({ id: z.string().min(1).max(128) }),
  run: async ({ id }) => {
    const owner = requireBcardOwner();
    if (!(await markNotificationRead(id, owner))) {
      fail(
        "La notificación no existe o ya fue leída. / Notification not found or already read.",
        { statusCode: 404, errorCode: "notification_not_found" },
      );
    }
    return { id, read: true };
  },
});
