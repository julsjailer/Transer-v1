import { defineAction } from "@agent-native/core/action";
import { countUnread } from "@agent-native/core/notifications";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Count unread notifications for the signed-in Transer account.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => ({ unreadCount: await countUnread(requireBcardOwner()) }),
});
