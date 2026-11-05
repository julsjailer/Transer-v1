import { defineAction } from "@agent-native/core";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { requireBcardOwner } from "../server/bcard.js";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "List the signed-in user's Cardex identifications in reverse chronological order.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const ownerEmail = requireBcardOwner();
    const rows = await getDb()
      .select({
        cardKey: schema.bcardCardexIdentifications.cardKey,
        identifiedAt: schema.bcardCardexIdentifications.identifiedAt,
      })
      .from(schema.bcardCardexIdentifications)
      .where(eq(schema.bcardCardexIdentifications.ownerEmail, ownerEmail))
      .orderBy(desc(schema.bcardCardexIdentifications.identifiedAt));
    return rows.flatMap((row) => {
      const card = CARTA_POR_CLAVE.get(row.cardKey);
      return card ? [{ ...row, ...card }] : [];
    });
  },
});
