import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardCard } from "../server/bcard.js";
import { requireTranserCreator } from "../server/transer-creator.js";

export default defineAction({
  description: "Set public availability of one B.Card catalog entry; creator access is enforced on the server.",
  schema: z.object({ cardKey: z.string().min(1), isPublic: z.boolean() }),
  run: async ({ cardKey, isPublic }) => {
    const creatorEmail = await requireTranserCreator();
    requireBcardCard(cardKey);
    const db = getDb();
    if (isPublic) {
      await db.insert(schema.bcardCatalogPublication).values({ cardKey, isPublic: true, updatedBy: creatorEmail, updatedAt: new Date().toISOString() }).onConflictDoUpdate({
        target: schema.bcardCatalogPublication.cardKey,
        set: { isPublic: true, updatedBy: creatorEmail, updatedAt: new Date().toISOString() },
      });
    } else {
      const [existing] = await db.select({ cardKey: schema.bcardCatalogPublication.cardKey }).from(schema.bcardCatalogPublication).where(eq(schema.bcardCatalogPublication.cardKey, cardKey)).limit(1);
      if (!existing) fail("La carta no está publicada.", { statusCode: 404, errorCode: "publication_not_found" });
      await db.update(schema.bcardCatalogPublication).set({ isPublic: false, updatedBy: creatorEmail, updatedAt: new Date().toISOString() }).where(eq(schema.bcardCatalogPublication.cardKey, cardKey));
    }
    return { cardKey, isPublic };
  },
});
