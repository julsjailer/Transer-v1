import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { requireBcardOwner } from "../server/bcard.js";
import { getDb, schema } from "../server/db.js";
import { notifyTranser } from "../server/transer-notifications.js";

export default defineAction({
  description:
    "Manage friend requests, follows, and the six active brother links for the signed-in account.",
  schema: z.discriminatedUnion("operation", [
    z.object({
      operation: z.literal("request"),
      username: z.string().trim().min(3).max(32),
    }),
    z.object({ operation: z.literal("accept"), requestId: z.string().uuid() }),
    z.object({
      operation: z.literal("accept-as-brother"),
      requestId: z.string().uuid(),
    }),
    z.object({ operation: z.literal("reject"), requestId: z.string().uuid() }),
    z.object({
      operation: z.literal("remove-friend"),
      username: z.string().trim().min(3).max(32),
    }),
    z.object({
      operation: z.literal("set-brother"),
      username: z.string().trim().min(3).max(32),
      enabled: z.boolean(),
    }),
    z.object({
      operation: z.literal("follow"),
      username: z.string().trim().min(3).max(32),
    }),
    z.object({
      operation: z.literal("unfollow"),
      username: z.string().trim().min(3).max(32),
    }),
  ]),
  needsApproval: (input) =>
    input.operation === "accept" ||
    input.operation === "accept-as-brother" ||
    input.operation === "reject" ||
    input.operation === "remove-friend" ||
    (input.operation === "set-brother" && !input.enabled),
  run: async (input) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    if (
      input.operation === "accept" ||
      input.operation === "accept-as-brother" ||
      input.operation === "reject"
    ) {
      const result = await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(schema.transerFriendRequests)
          .where(
            and(
              eq(schema.transerFriendRequests.id, input.requestId),
              eq(schema.transerFriendRequests.targetEmail, ownerEmail),
              eq(schema.transerFriendRequests.status, "pending"),
            ),
          )
          .for("update")
          .limit(1);
        if (!request)
          fail("La solicitud no existe o ya fue atendida.", {
            statusCode: 404,
            errorCode: "request_not_found",
          });

        if (input.operation === "accept-as-brother") {
          await tx
            .select({ ownerEmail: schema.transerProfiles.ownerEmail })
            .from(schema.transerProfiles)
            .where(
              or(
                eq(schema.transerProfiles.ownerEmail, ownerEmail),
                eq(schema.transerProfiles.ownerEmail, request.requesterEmail),
              ),
            )
            .orderBy(schema.transerProfiles.ownerEmail)
            .for("update");
          const [ownerBrothers, requesterBrothers] = await Promise.all([
            tx
              .select({ id: schema.transerFriendRequests.id })
              .from(schema.transerFriendRequests)
              .where(
                and(
                  eq(schema.transerFriendRequests.status, "accepted"),
                  eq(schema.transerFriendRequests.isBrother, true),
                  or(
                    eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                    eq(schema.transerFriendRequests.targetEmail, ownerEmail),
                  ),
                ),
              ),
            tx
              .select({ id: schema.transerFriendRequests.id })
              .from(schema.transerFriendRequests)
              .where(
                and(
                  eq(schema.transerFriendRequests.status, "accepted"),
                  eq(schema.transerFriendRequests.isBrother, true),
                  or(
                    eq(
                      schema.transerFriendRequests.requesterEmail,
                      request.requesterEmail,
                    ),
                    eq(
                      schema.transerFriendRequests.targetEmail,
                      request.requesterEmail,
                    ),
                  ),
                ),
              ),
          ]);
          if (ownerBrothers.length >= 6 || requesterBrothers.length >= 6)
            fail("Cada cuenta puede tener como máximo 6 hermanos activos.", {
              statusCode: 409,
              errorCode: "brother_limit",
            });
        }

        const [updated] = await tx
          .update(schema.transerFriendRequests)
          .set({
            status: input.operation === "reject" ? "rejected" : "accepted",
            isBrother: input.operation === "accept-as-brother",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(schema.transerFriendRequests.id, request.id),
              eq(schema.transerFriendRequests.targetEmail, ownerEmail),
              eq(schema.transerFriendRequests.status, "pending"),
            ),
          )
          .returning({ id: schema.transerFriendRequests.id });
        if (!updated)
          fail(
            "La solicitud ya cambió de estado. Actualiza la lista e inténtalo de nuevo si corresponde.",
            { statusCode: 409, errorCode: "request_state_changed" },
          );
        const [requester] = await tx
          .select({
            username: schema.transerProfiles.username,
            displayName: schema.transerProfiles.displayName,
          })
          .from(schema.transerProfiles)
          .where(eq(schema.transerProfiles.ownerEmail, request.requesterEmail))
          .limit(1);
        return { request, requester };
      });
      await notifyTranser(result.request.requesterEmail, {
        category: "connections",
        title:
          input.operation === "reject"
            ? "Solicitud respondida / Request updated"
            : "Solicitud aceptada / Request accepted",
        body:
          input.operation === "reject"
            ? "Tu solicitud de conexión fue rechazada / Your connection request was declined."
            : "Tu solicitud de conexión fue aceptada / Your connection request was accepted.",
        entityId: result.request.id,
        idempotencyKey: `transer-request-${result.request.id}-${input.operation}`,
      });
      return {
        operation: input.operation,
        username: result.requester?.username ?? "usuario",
        displayName: result.requester?.displayName ?? "Usuario",
      };
    }
    const [target] = await db
      .select({
        ownerEmail: schema.transerProfiles.ownerEmail,
        username: schema.transerProfiles.username,
      })
      .from(schema.transerProfiles)
      .where(eq(schema.transerProfiles.username, input.username.toLowerCase()))
      .limit(1);
    if (!target || target.ownerEmail === ownerEmail)
      fail("No encontramos otra cuenta con ese username.", {
        statusCode: 404,
        errorCode: "account_not_found",
      });
    if (input.operation === "request") {
      const [accepted] = await db
        .select({ id: schema.transerFriendRequests.id })
        .from(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.status, "accepted"),
            or(
              and(
                eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                eq(schema.transerFriendRequests.targetEmail, target.ownerEmail),
              ),
              and(
                eq(
                  schema.transerFriendRequests.requesterEmail,
                  target.ownerEmail,
                ),
                eq(schema.transerFriendRequests.targetEmail, ownerEmail),
              ),
            ),
          ),
        )
        .limit(1);
      if (accepted)
        fail("Estas cuentas ya son amigas.", {
          statusCode: 409,
          errorCode: "already_friends",
        });
      const [existing] = await db
        .select({ id: schema.transerFriendRequests.id })
        .from(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.status, "pending"),
            or(
              and(
                eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                eq(schema.transerFriendRequests.targetEmail, target.ownerEmail),
              ),
              and(
                eq(
                  schema.transerFriendRequests.requesterEmail,
                  target.ownerEmail,
                ),
                eq(schema.transerFriendRequests.targetEmail, ownerEmail),
              ),
            ),
          ),
        )
        .limit(1);
      if (existing)
        fail("Ya existe una solicitud pendiente entre estas cuentas.", {
          statusCode: 409,
          errorCode: "request_pending",
        });
      const requestId = crypto.randomUUID();
      await db.insert(schema.transerFriendRequests).values({
        id: requestId,
        requesterEmail: ownerEmail,
        targetEmail: target.ownerEmail,
        status: "pending",
        isBrother: false,
      });
      await notifyTranser(target.ownerEmail, {
        category: "connections",
        title: "Nueva solicitud de conexión / New connection request",
        body: "Tienes una nueva solicitud en DEMPA / You have a new DEMPA request.",
        entityId: requestId,
        idempotencyKey: `transer-request-${requestId}-incoming`,
      });
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "follow") {
      await db
        .insert(schema.transerFollows)
        .values({ followerEmail: ownerEmail, targetEmail: target.ownerEmail })
        .onConflictDoNothing();
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "unfollow") {
      await db
        .delete(schema.transerFollows)
        .where(
          and(
            eq(schema.transerFollows.followerEmail, ownerEmail),
            eq(schema.transerFollows.targetEmail, target.ownerEmail),
          ),
        );
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "remove-friend") {
      const [removed] = await db
        .delete(schema.transerFriendRequests)
        .where(
          and(
            eq(schema.transerFriendRequests.status, "accepted"),
            or(
              and(
                eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                eq(schema.transerFriendRequests.targetEmail, target.ownerEmail),
              ),
              and(
                eq(
                  schema.transerFriendRequests.requesterEmail,
                  target.ownerEmail,
                ),
                eq(schema.transerFriendRequests.targetEmail, ownerEmail),
              ),
            ),
          ),
        )
        .returning({ id: schema.transerFriendRequests.id });
      if (removed)
        await notifyTranser(target.ownerEmail, {
          category: "connections",
          title: "Conexión eliminada / Connection removed",
          body: "Una conexión de Transer fue eliminada / A Transer connection was removed.",
          entityId: removed.id,
          idempotencyKey: `transer-connection-removed-${removed.id}`,
        });
      return { operation: input.operation, username: target.username };
    }
    if (input.operation === "set-brother") {
      return db.transaction(async (tx) => {
        await tx
          .select({ ownerEmail: schema.transerProfiles.ownerEmail })
          .from(schema.transerProfiles)
          .where(
            or(
              eq(schema.transerProfiles.ownerEmail, ownerEmail),
              eq(schema.transerProfiles.ownerEmail, target.ownerEmail),
            ),
          )
          .orderBy(schema.transerProfiles.ownerEmail)
          .for("update");
        const [friend] = await tx
          .select()
          .from(schema.transerFriendRequests)
          .where(
            and(
              eq(schema.transerFriendRequests.status, "accepted"),
              or(
                and(
                  eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                  eq(
                    schema.transerFriendRequests.targetEmail,
                    target.ownerEmail,
                  ),
                ),
                and(
                  eq(
                    schema.transerFriendRequests.requesterEmail,
                    target.ownerEmail,
                  ),
                  eq(schema.transerFriendRequests.targetEmail, ownerEmail),
                ),
              ),
            ),
          )
          .for("update")
          .limit(1);
        if (!friend)
          fail("Solo puedes vincular como hermano a una amistad aceptada.", {
            statusCode: 409,
            errorCode: "friendship_required",
          });
        if (input.enabled && !friend.isBrother) {
          const [ownerCount, targetCount] = await Promise.all([
            tx
              .select({ email: schema.transerFriendRequests.requesterEmail })
              .from(schema.transerFriendRequests)
              .where(
                and(
                  eq(schema.transerFriendRequests.status, "accepted"),
                  eq(schema.transerFriendRequests.isBrother, true),
                  or(
                    eq(schema.transerFriendRequests.requesterEmail, ownerEmail),
                    eq(schema.transerFriendRequests.targetEmail, ownerEmail),
                  ),
                ),
              ),
            tx
              .select({ email: schema.transerFriendRequests.requesterEmail })
              .from(schema.transerFriendRequests)
              .where(
                and(
                  eq(schema.transerFriendRequests.status, "accepted"),
                  eq(schema.transerFriendRequests.isBrother, true),
                  or(
                    eq(
                      schema.transerFriendRequests.requesterEmail,
                      target.ownerEmail,
                    ),
                    eq(
                      schema.transerFriendRequests.targetEmail,
                      target.ownerEmail,
                    ),
                  ),
                ),
              ),
          ]);
          if (ownerCount.length >= 6 || targetCount.length >= 6)
            fail("Cada cuenta puede tener como máximo 6 hermanos activos.", {
              statusCode: 409,
              errorCode: "brother_limit",
            });
        }
        await tx
          .update(schema.transerFriendRequests)
          .set({
            isBrother: input.enabled,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.transerFriendRequests.id, friend.id));
        return {
          operation: input.operation,
          username: target.username,
          isBrother: input.enabled,
        };
      });
    }
  },
});
