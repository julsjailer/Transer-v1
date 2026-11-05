import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { STORE_ITEM_BY_KEY, STORE_ITEMS } from "../app/lib/bcard-store";
import { CARTA_POR_CLAVE, type Carta } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";

type StoreProduct =
  | { type: "card"; name: string; card: Carta }
  | { type: "item"; name: (typeof STORE_ITEMS)[number]["name"]; item: (typeof STORE_ITEMS)[number] };

export default defineAction({
  description: "List creator-published cards and utility items available for Zeny purchase.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const listings = await getDb().select().from(schema.bcardStoreListings);
    type PublicListing = Omit<(typeof listings)[number], "updatedBy">;
    const result: Array<PublicListing & { product: StoreProduct }> = [];
    for (const listing of listings) {
      const { updatedBy: _updatedBy, ...publicListing } = listing;
      if (listing.productType === "card") {
        const card = CARTA_POR_CLAVE.get(listing.productKey);
        if (card) result.push({ ...publicListing, product: { type: "card", name: card.nombre, card } });
        continue;
      }
      const item = STORE_ITEM_BY_KEY.get(listing.productKey as never);
      if (item) result.push({ ...publicListing, product: { type: "item", name: item.name, item } });
    }
    return result;
  },
});
