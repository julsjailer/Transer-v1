import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Manage friend requests, follows, and the six active brother links for the signed-in account.",
  schema: z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("request"), username: z.string().trim().min(3).max(32) }),
    z.object({ operation: z.literal("accept"), requestId: z.string().uuid() }),
    z.object({ operation: z.literal("reject"), requestId: z.string().uuid() }),
    z.object({ operation: z.literal("remove-friend"), username: z.string().trim().min(3).max(32) }),
    z.object({ operation: z.literal("set-brother"), username: z.string().trim().min(3).max(32), enabled: z.boolean() }),
    z.object({ operation: z.literal("follow"), username: z.string().trim().min(3).max(32) }),
    z.object({ operation: z.literal("unfollow"), username: z.string().trim().min(3).max(32) }),
  ]),
  run: async (input) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    if (input.operation === "accept" || input.operation === "reject") {
      const [request] = await db.select().from(schema.transerFriendRequests).where(and(
        eq(schema.transerFriendRequests.id, input.requestId),
        eq(schema.transerFriendRequests.targetEmail, ownerEmail),
        eq(schema.transerFriendRequests.status, "pending"),
      )).limit(1);
      if (!request) fail("La solicitud no existe o ya fue atendida.", { statusCode: 404, errorCode: "request_not_found" });
      await db.update(schema.transerFriendRequests).set({ status: input.operation === "accept" ? "accepted" : "rejected", updatedAt: new Date().toISOString() }).where(eq(schema.transerFriendRequests.id, request.id));
      return { operation: input.operation, username: request.requesterEmail };
    }
    const [target] = await db.select({ ownerEmail: schema.transerProfiles.ownerEmail, username: schema.transerProfiles.username }).from(schema.transerProfiles).where(eq(schema.transerProfiles.username, input.username.toLowerCase())).limit(1);
    if (!target || target.ownerEmail === ownerEmail) fail("No encontramos otra cuenta con ese username.", { statusCode: 404, errorCode: "account_not_found" });
    if (input.operation === "request") {
      const [accepted] = await db.select({ id: schema.transerFriendRequests.id }).from(schema.transerFriendRequests).where(and(
        eq(schema.transerFriendRequests.status, "accepted"),
        or(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, target.ownerEmail)), and(eq(schema.transerFriendRequests.requesterEmail, target.ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail))),
      )).limit(1);
      if (accepted) fail("Estas cuentas ya son amigas.", { statusCode: 409, errorCode: "already_friends" });
      const [existing] = await db.select({ id: schema.transerFriendRequests.id }).from(schema.transerFriendRequests).where(and(
        eq(schema.transerFriendRequests.status, "pending"),
        or(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, target.ownerEmail)), and(eq(schema.transerFriendRequests.requesterEmail, target.ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail))),
      )).limit(1);
      if (existing) fail("Ya existe una solicitud pendiente entre estas cuentas.", { statusCode: 409, errorCode: "request_pending" });
      await db.insert(schema.transerFriendRequests).values({ id: crypto.randomUUID(), requesterEmail: ownerEmail, targetEmail: target.ownerEmail, status: "pending", isBrother: false });
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "follow") {
      await db.insert(schema.transerFollows).values({ followerEmail: ownerEmail, targetEmail: target.ownerEmail }).onConflictDoNothing();
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "unfollow") {
      await db.delete(schema.transerFollows).where(and(eq(schema.transerFollows.followerEmail, ownerEmail), eq(schema.transerFollows.targetEmail, target.ownerEmail)));
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "remove-friend") {
      await db.delete(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.status, "accepted"), or(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, target.ownerEmail)), and(eq(schema.transerFriendRequests.requesterEmail, target.ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail)))));
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "set-brother") {
      return db.transaction(async (tx) => {
        await tx.select({ ownerEmail: schema.transerProfiles.ownerEmail }).from(schema.transerProfiles)
          .where(or(eq(schema.transerProfiles.ownerEmail, ownerEmail), eq(schema.transerProfiles.ownerEmail, target.ownerEmail)))
          .orderBy(schema.transerProfiles.ownerEmail).for("update");
        const [friend] = await tx.select().from(schema.transerFriendRequests).where(and(
          eq(schema.transerFriendRequests.status, "accepted"),
          or(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, target.ownerEmail)), and(eq(schema.transerFriendRequests.requesterEmail, target.ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail))),
        )).for("update").limit(1);
        if (!friend) fail("Solo puedes vincular como hermano a una amistad aceptada.", { statusCode: 409, errorCode: "friendship_required" });
        if (input.enabled && !friend.isBrother) {
          const [ownerCount, targetCount] = await Promise.all([
            tx.select({ email: schema.transerFriendRequests.requesterEmail }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.status, "accepted"), eq(schema.transerFriendRequests.isBrother, true), or(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail)))),
            tx.select({ email: schema.transerFriendRequests.requesterEmail }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.status, "accepted"), eq(schema.transerFriendRequests.isBrother, true), or(eq(schema.transerFriendRequests.requesterEmail, target.ownerEmail), eq(schema.transerFriendRequests.targetEmail, target.ownerEmail)))),
          ]);
          if (ownerCount.length >= 6 || targetCount.length >= 6) fail("Cada cuenta puede tener como máximo 6 hermanos activos.", { statusCode: 409, errorCode: "brother_limit" });
        }
        await tx.update(schema.transerFriendRequests).set({ isBrother: input.enabled, updatedAt: new Date().toISOString() }).where(eq(schema.transerFriendRequests.id, friend.id));
        return { operation: input.operation, username: target.username, isBrother: input.enabled };
      });
    }
  },
});
