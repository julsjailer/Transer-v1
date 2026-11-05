import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { STORE_ITEM_BY_KEY } from "../app/lib/bcard-store";
import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { requireTranserCreator } from "../server/transer-creator.js";

export default defineAction({
  description: "Create a time-limited event and authorize GIGA cards for its duration.",
  schema: z.object({
    title: z.string().trim().min(3).max(64),
    description: z.string().trim().max(240).default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    rewardType: z.enum(["card", "item", "zeny"]),
    rewardKey: z.string().max(100).nullable().default(null),
    rewardQuantity: z.number().int().min(0).max(100).default(0),
    rewardZeny: z.number().int().min(0).max(100000).default(0),
    gigaCardKeys: z.array(z.string().min(1)).max(100).default([]),
  }),
  run: async ({ title, description, startsAt, endsAt, rewardType, rewardKey, rewardQuantity, rewardZeny, gigaCardKeys }) => {
    const creatorEmail = await requireTranserCreator();
    if (Date.parse(endsAt) <= Date.parse(startsAt)) fail("La fecha de cierre debe ser posterior al inicio.", { statusCode: 400, errorCode: "invalid_event_window" });
    if (rewardType === "card" && (!rewardKey || !CARTA_POR_CLAVE.has(rewardKey))) fail("Selecciona una carta válida.", { statusCode: 400, errorCode: "invalid_event_reward" });
    if (rewardType === "item" && (!rewardKey || !STORE_ITEM_BY_KEY.has(rewardKey as never))) fail("Selecciona un objeto válido.", { statusCode: 400, errorCode: "invalid_event_reward" });
    if (rewardType === "zeny" && rewardZeny < 1) fail("La recompensa debe incluir Zenys.", { statusCode: 400, errorCode: "invalid_event_reward" });
    for (const cardKey of gigaCardKeys) {
      if (CARTA_POR_CLAVE.get(cardKey)?.clase !== "giga") fail("Solo se pueden autorizar cartas GIGA en esta lista.", { statusCode: 400, errorCode: "invalid_giga_card" });
    }
    const id = crypto.randomUUID();
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.transerEvents).values({ id, title, description, startsAt, endsAt, rewardType, rewardKey, rewardQuantity, rewardZeny, createdBy: creatorEmail });
      if (gigaCardKeys.length) await tx.insert(schema.transerEventCards).values(gigaCardKeys.map((cardKey) => ({ eventId: id, cardKey }))).onConflictDoNothing();
    });
    return { id, title, startsAt, endsAt, gigaCardsAuthorized: gigaCardKeys.length };
  },
});
