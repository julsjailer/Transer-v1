import { eq } from "drizzle-orm";
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Set whether the signed-in user's B.Card collection is public; folders remain private.",
  schema: z.object({ collectionPublic: z.boolean().describe("Whether to expose the collection on the public profile") }),
  run: async ({ collectionPublic }) => {
    const ownerEmail = requireBcardOwner();
    const [settings] = await getDb().insert(schema.bcardProfileSettings).values({
      ownerEmail,
      publicId: crypto.randomUUID(),
      collectionPublic,
      updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: schema.bcardProfileSettings.ownerEmail,
      set: { collectionPublic, updatedAt: new Date().toISOString() },
    }).returning({ collectionPublic: schema.bcardProfileSettings.collectionPublic, publicId: schema.bcardProfileSettings.publicId });
    return settings;
  },
});
