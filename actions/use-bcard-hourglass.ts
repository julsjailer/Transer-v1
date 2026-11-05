import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

const HOUR_MS = 60 * 60 * 1000;

export default defineAction({
  description: "Consume owned hourglasses to reduce the B.Card cooldown by one hour per item.",
  schema: z.object({ quantity: z.number().int().min(1).max(12) }),
  run: async ({ quantity }) => {
    const ownerEmail = requireBcardOwner();
    const now = new Date();
    return getDb().transaction(async (tx) => {
      const [claim] = await tx.select().from(schema.bcardPackClaims)
        .where(eq(schema.bcardPackClaims.ownerEmail, ownerEmail)).for("update");
      if (!claim) fail("No hay un temporizador que acelerar.", { statusCode: 409, errorCode: "pack_not_started" });
      const remainingMs = new Date(claim.nextClaimAt).getTime() - now.getTime();
      if (remainingMs <= 0) fail("El sobre ya está disponible.", { statusCode: 409, errorCode: "pack_ready" });
      const maximumUseful = Math.ceil(remainingMs / HOUR_MS);
      if (quantity > maximumUseful) fail("La cantidad supera las horas restantes.", { statusCode: 400, errorCode: "too_many_hourglasses", details: { maximumUseful } });
      const [items] = await tx.select().from(schema.bcardItems).where(and(
        eq(schema.bcardItems.ownerEmail, ownerEmail),
        eq(schema.bcardItems.itemKey, "hourglass"),
      )).for("update");
      if (!items || items.quantity < quantity) fail("No tienes suficientes relojes de arena.", { statusCode: 409, errorCode: "not_enough_hourglasses" });
      const nextClaimAt = new Date(Math.max(now.getTime(), new Date(claim.nextClaimAt).getTime() - quantity * HOUR_MS)).toISOString();
      await tx.update(schema.bcardItems).set({ quantity: items.quantity - quantity, updatedAt: now.toISOString() }).where(and(
        eq(schema.bcardItems.ownerEmail, ownerEmail),
        eq(schema.bcardItems.itemKey, "hourglass"),
      ));
      await tx.insert(schema.bcardItemUses).values({ id: crypto.randomUUID(), ownerEmail, itemKey: "hourglass", usedAt: now.toISOString() });
      await tx.update(schema.bcardPackClaims).set({ nextClaimAt }).where(eq(schema.bcardPackClaims.ownerEmail, ownerEmail));
      return { consumed: quantity, nextClaimAt, available: new Date(nextClaimAt).getTime() <= now.getTime() };
    });
  },
});
