import { defineAction } from "@agent-native/core/action";
import { getTranserCreatorStatus } from "../server/transer-creator.js";
import { z } from "zod";

export default defineAction({
  description: "Return the signed-in user's Transer creator or delegated-admin status.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => getTranserCreatorStatus(),
});
