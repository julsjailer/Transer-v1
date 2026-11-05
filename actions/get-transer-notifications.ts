import { defineAction } from "@agent-native/core/action";
import {
  countUnread,
  listNotifications,
} from "@agent-native/core/notifications";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description:
    "List recent signed-in Transer notifications with category metadata and the unread count.",
  schema: z.object({ limit: z.number().int().min(1).max(200).default(100) }),
  http: { method: "GET" },
  run: async ({ limit }) => {
    const owner = requireBcardOwner();
    const [rows, unreadCount] = await Promise.all([
      listNotifications(owner, { limit }),
      countUnread(owner),
    ]);
    const notifications = rows.map(
      ({ id, severity, title, body, metadata, createdAt, readAt }) => ({
        id,
        severity,
        title,
        body,
        metadata,
        createdAt,
        readAt,
      }),
    );
    return { notifications, unreadCount };
  },
});
