import { defineAction, fail } from "@agent-native/core/action";
import { eq, or } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireTranserOwner } from "../server/transer-creator.js";

export default defineAction({
  description: "Grant or revoke creator admin access for registered accounts, or transfer creator ownership to a registered account.",
  schema: z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("grant"), userEmail: z.string().trim().email().toLowerCase() }),
    z.object({ operation: z.literal("revoke"), userEmail: z.string().trim().email().toLowerCase() }),
    z.object({ operation: z.literal("transfer"), userEmail: z.string().trim().email().toLowerCase() }),
  ]),
  run: async ({ operation, userEmail }) => {
    const ownerEmail = await requireTranserOwner();
    if (userEmail === ownerEmail) fail("El propietario no puede delegarse a sí mismo.", { statusCode: 400, errorCode: "self_delegation" });
    const db = getDb();
    if (operation !== "revoke") {
      const [registered] = await db.select({ email: schema.transerProfiles.ownerEmail }).from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, userEmail)).limit(1);
      if (!registered) fail("La cuenta debe iniciar sesión en Transer antes de recibir permisos.", { statusCode: 404, errorCode: "account_not_registered" });
    }
    if (operation === "grant") {
      await db.insert(schema.transerCreatorAdmins).values({ userEmail, grantedBy: ownerEmail }).onConflictDoUpdate({
        target: schema.transerCreatorAdmins.userEmail,
        set: { grantedBy: ownerEmail, createdAt: new Date().toISOString() },
      });
      return { operation, userEmail };
    }
    if (operation === "revoke") {
      await db.delete(schema.transerCreatorAdmins).where(eq(schema.transerCreatorAdmins.userEmail, userEmail));
      return { operation, userEmail };
    }
    return db.transaction(async (tx) => {
      const [changed] = await tx.update(schema.transerCreatorOwner).set({ ownerEmail: userEmail, updatedAt: new Date().toISOString() }).where(eq(schema.transerCreatorOwner.id, "primary")).returning({ ownerEmail: schema.transerCreatorOwner.ownerEmail });
      if (!changed) fail("No se encontró el propietario actual.", { statusCode: 409, errorCode: "creator_owner_missing" });
      await tx.delete(schema.transerCreatorAdmins).where(or(
        eq(schema.transerCreatorAdmins.userEmail, ownerEmail),
        eq(schema.transerCreatorAdmins.userEmail, userEmail),
      ));
      return { operation, userEmail };
    });
  },
});
