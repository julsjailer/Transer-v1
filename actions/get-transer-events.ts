import { defineAction } from "@agent-native/core/action";
import { and, eq, gt, inArray } from "drizzle-orm";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { z } from "zod";

import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "Read current and upcoming Transer events; signed-in users also see their claim status.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const now = new Date().toISOString();
    const db = getDb();
    const events = await db.select({
      id: schema.transerEvents.id,
      title: schema.transerEvents.title,
      description: schema.transerEvents.description,
      startsAt: schema.transerEvents.startsAt,
      endsAt: schema.transerEvents.endsAt,
      rewardType: schema.transerEvents.rewardType,
      rewardKey: schema.transerEvents.rewardKey,
      rewardQuantity: schema.transerEvents.rewardQuantity,
      rewardZeny: schema.transerEvents.rewardZeny,
    }).from(schema.transerEvents).where(gt(schema.transerEvents.endsAt, now)).orderBy(schema.transerEvents.startsAt);
    if (!events.length) return [];
    const cards = await db.select().from(schema.transerEventCards).where(inArray(schema.transerEventCards.eventId, events.map((event) => event.id)));
    const ownerEmail = getRequestUserEmail();
    const claims = ownerEmail ? await db.select({ eventId: schema.transerEventClaims.eventId }).from(schema.transerEventClaims).where(and(eq(schema.transerEventClaims.ownerEmail, ownerEmail), inArray(schema.transerEventClaims.eventId, events.map((event) => event.id)))) : [];
    return events.map((event) => ({
      ...event,
      active: Date.parse(event.startsAt) <= Date.now(),
      claimed: claims.some((claim) => claim.eventId === event.id),
      gigaCards: cards.filter((card) => card.eventId === event.id).map(({ cardKey }) => ({ cardKey, card: CARTA_POR_CLAVE.get(cardKey) })).filter((entry) => entry.card !== undefined),
    }));
  },
});
