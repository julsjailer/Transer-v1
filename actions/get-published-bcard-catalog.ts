import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "List B.Card catalog entries published by the creator for signed-in Transer users.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const rows = await getDb().select({ cardKey: schema.bcardCatalogPublication.cardKey }).from(schema.bcardCatalogPublication).where(eq(schema.bcardCatalogPublication.isPublic, true));
    return rows.flatMap(({ cardKey }) => {
      const card = CARTA_POR_CLAVE.get(cardKey);
      return card ? [{ ...card, cardKey }] : [];
    });
  },
});
