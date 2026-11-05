import { defineAction, fail } from "@agent-native/core";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { requireBcardOwner } from "../server/bcard.js";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Save or return the signed-in user's unique Cardex identification for a battle card.",
  schema: z.object({ cardKey: z.string().min(1) }),
  run: async ({ cardKey }) => {
    const card = CARTA_POR_CLAVE.get(cardKey);
    if (!card)
      fail("No encontramos esta carta en el catálogo.", {
        statusCode: 404,
        errorCode: "card_not_found",
      });
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    const [inserted] = await db
      .insert(schema.bcardCardexIdentifications)
      .values({
        id: crypto.randomUUID(),
        ownerEmail,
        cardKey,
        identifiedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning({
        identifiedAt: schema.bcardCardexIdentifications.identifiedAt,
      });
    const [identification] = inserted
      ? [inserted]
      : await db
          .select({
            identifiedAt: schema.bcardCardexIdentifications.identifiedAt,
          })
          .from(schema.bcardCardexIdentifications)
          .where(
            and(
              eq(schema.bcardCardexIdentifications.ownerEmail, ownerEmail),
              eq(schema.bcardCardexIdentifications.cardKey, cardKey),
            ),
          )
          .limit(1);
    if (!identification)
      fail("No se pudo guardar la identificación.", {
        statusCode: 500,
        errorCode: "cardex_record_unavailable",
      });
    return {
      cardKey,
      card,
      identifiedAt: identification.identifiedAt,
      alreadyIdentified: !inserted,
    };
  },
});
