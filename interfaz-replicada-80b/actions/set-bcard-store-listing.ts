import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { STORE_ITEM_BY_KEY } from "../app/lib/bcard-store";
import { getDb, schema } from "../server/db.js";
import { requireBcardCard } from "../server/bcard.js";
import { requireTranserCreator } from "../server/transer-creator.js";

export default defineAction({
  description: "Publish or remove an item from the Zeny store with creator-defined rarity and price.",
  schema: z.object({
    productType: z.enum(["card", "item"]),
    productKey: z.string().min(1).max(100),
    rarity: z.enum(["standard", "mega", "giga"]),
    price: z.number().int().min(1).max(1_000_000),
    listed: z.boolean(),
  }),
  run: async ({ productType, productKey, rarity, price, listed }) => {
    const editorEmail = await requireTranserCreator();
    if (productType === "card") {
      const card = requireBcardCard(productKey);
      if (card.clase === "giga" && rarity !== "giga") fail("La rareza de la carta no coincide.", { statusCode: 400, errorCode: "rarity_mismatch" });
    } else if (!STORE_ITEM_BY_KEY.has(productKey as never)) {
      fail("El objeto no existe.", { statusCode: 404, errorCode: "store_item_not_found" });
    }
    const db = getDb();
    if (listed) {
      await db.insert(schema.bcardStoreListings).values({
        cardKey: `${productType}:${productKey}`, productType, productKey, rarity, price, updatedBy: editorEmail,
      }).onConflictDoUpdate({
        target: [schema.bcardStoreListings.productType, schema.bcardStoreListings.productKey],
        set: { rarity, price, updatedBy: editorEmail, updatedAt: new Date().toISOString() },
      });
    } else {
      await db.delete(schema.bcardStoreListings).where(and(
        eq(schema.bcardStoreListings.productType, productType),
        eq(schema.bcardStoreListings.productKey, productKey),
      ));
    }
    return { productType, productKey, rarity, price, listed };
  },
});
