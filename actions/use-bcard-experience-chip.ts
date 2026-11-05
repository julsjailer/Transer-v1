import { defineAction, fail } from "@agent-native/core";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";
import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Consume experience chips from the signed-in user's inventory and update their level.",
  schema: z.object({ quantity: z.number().int().min(1).max(99) }),
  run: async ({ quantity }) => {
    const ownerEmail = requireBcardOwner();
    const now = new Date().toISOString();
    return getDb().transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(schema.bcardItems)
        .where(
          and(
            eq(schema.bcardItems.ownerEmail, ownerEmail),
            eq(schema.bcardItems.itemKey, "experience-chip"),
          ),
        )
        .for("update")
        .limit(1);
      if (!item || item.quantity < quantity)
        fail("No tienes suficientes chips de experiencia.", {
          statusCode: 409,
          errorCode: "not_enough_experience_chips",
        });
      const [profile] = await tx
        .select({ experience: schema.transerProfiles.experience })
        .from(schema.transerProfiles)
        .where(eq(schema.transerProfiles.ownerEmail, ownerEmail))
        .for("update")
        .limit(1);
      if (!profile)
        fail("No se encontró el perfil de progresión.", {
          statusCode: 404,
          errorCode: "profile_not_found",
        });
      const experience = profile.experience + quantity * 25;
      const level = 1 + Math.floor(experience / 100);
      await tx
        .update(schema.bcardItems)
        .set({ quantity: item.quantity - quantity, updatedAt: now })
        .where(
          and(
            eq(schema.bcardItems.ownerEmail, ownerEmail),
            eq(schema.bcardItems.itemKey, "experience-chip"),
          ),
        );
      await tx
        .update(schema.transerProfiles)
        .set({ experience, level, updatedAt: now })
        .where(eq(schema.transerProfiles.ownerEmail, ownerEmail));
      await tx.insert(schema.bcardItemUses).values({
        id: crypto.randomUUID(),
        ownerEmail,
        itemKey: "experience-chip",
        usedAt: now,
      });
      return { consumed: quantity, experience, level };
    });
  },
});
