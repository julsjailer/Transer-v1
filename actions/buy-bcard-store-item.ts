import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { STORE_ITEM_BY_KEY } from "../app/lib/bcard-store";
import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Spend Zeny once and atomically add the purchased card or item to inventory.",
  schema: z.object({ productType: z.enum(["card", "item"]), productKey: z.string().min(1).max(100) }),
  run: async ({ productType, productKey }) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const now = new Date().toISOString();
    return db.transaction(async (tx) => {
      const [listing] = await tx.select().from(schema.bcardStoreListings).where(and(
        eq(schema.bcardStoreListings.productType, productType),
        eq(schema.bcardStoreListings.productKey, productKey),
      )).for("update").limit(1);
      if (!listing) fail("Este producto no está disponible en la tienda.", { statusCode: 404, errorCode: "store_listing_not_found" });
      if (productType === "card" && !CARTA_POR_CLAVE.has(productKey)) fail("La carta no existe.", { statusCode: 404, errorCode: "card_not_found" });
      if (productType === "item" && !STORE_ITEM_BY_KEY.has(productKey as never)) fail("El objeto no existe.", { statusCode: 404, errorCode: "store_item_not_found" });
      const [account] = await tx.update(schema.zenyAccounts).set({ balance: sql`${schema.zenyAccounts.balance} - ${listing.price}`, updatedAt: now })
        .where(and(eq(schema.zenyAccounts.ownerEmail, ownerEmail), gte(schema.zenyAccounts.balance, listing.price)))
        .returning({ balance: schema.zenyAccounts.balance });
      if (!account) fail("No tienes suficientes Zenys.", { statusCode: 409, errorCode: "insufficient_zeny" });
      const purchaseId = crypto.randomUUID();
      await tx.insert(schema.transerStorePurchases).values({ id: purchaseId, ownerEmail, productType, productKey, price: listing.price, purchasedAt: now });
      if (productType === "card") {
        await tx.insert(schema.bcardInventory).values({ id: crypto.randomUUID(), ownerEmail, cardKey: productKey, quantity: 1, createdAt: now, updatedAt: now }).onConflictDoUpdate({
          target: [schema.bcardInventory.ownerEmail, schema.bcardInventory.cardKey],
          set: { quantity: sql`${schema.bcardInventory.quantity} + 1`, updatedAt: now },
        });
        await tx.insert(schema.bcardRewardEvents).values({ id: crypto.randomUUID(), ownerEmail, sourceType: "store", sourceKey: purchaseId, cardKey: productKey, quantity: 1, createdAt: now });
      } else {
        await tx.insert(schema.bcardItems).values({ ownerEmail, itemKey: productKey, quantity: 1, updatedAt: now }).onConflictDoUpdate({
          target: [schema.bcardItems.ownerEmail, schema.bcardItems.itemKey],
          set: { quantity: sql`${schema.bcardItems.quantity} + 1`, updatedAt: now },
        });
      }
      return { productType, productKey, price: listing.price, balance: account.balance };
    });
  },
});
