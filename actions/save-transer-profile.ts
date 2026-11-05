import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const USERNAME_QUICK_CHANGE_MS = 5 * 60 * 1000;

export default defineAction({
  description: "Save the signed-in user's private Transer profile.",
  schema: z.object({
    username: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/),
    displayName: z.string().trim().min(1).max(48),
    description: z.string().trim().max(240),
    secretDescription: z.string().trim().max(240),
    avatarData: z.string().max(2_800_000).nullable(),
  }),
  run: async ({ username, displayName, description, secretDescription, avatarData }) => {
    const ownerEmail = requireBcardOwner();
    if (avatarData && !/^data:image\/(png|jpeg|webp);base64,/.test(avatarData)) {
      fail("La foto debe ser PNG, JPEG o WebP.", { statusCode: 400, errorCode: "invalid_avatar" });
    }
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const profile = await getDb().transaction(async (tx) => {
      const [current] = await tx.select().from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).for("update").limit(1);
      if (!current) fail("No se pudo cargar el perfil.", { statusCode: 404, errorCode: "profile_not_found" });
      let usernameChangedAt = current.usernameChangedAt;
      let usernameQuickChangeUntil = current.usernameQuickChangeUntil;
      if (username !== current.username) {
        const quickChangeOpen = Boolean(usernameQuickChangeUntil && Date.parse(usernameQuickChangeUntil) > nowMs);
        const cooldownElapsed = !usernameChangedAt || nowMs >= Date.parse(usernameChangedAt) + USERNAME_COOLDOWN_MS;
        if (!quickChangeOpen && !cooldownElapsed) {
          fail("Podrás cambiar tu nombre de usuario después del período de espera.", { statusCode: 409, errorCode: "username_change_cooldown" });
        }
        const [taken] = await tx.select({ ownerEmail: schema.transerProfiles.ownerEmail }).from(schema.transerProfiles).where(and(
          eq(schema.transerProfiles.username, username),
          ne(schema.transerProfiles.ownerEmail, ownerEmail),
        )).limit(1);
        if (taken) fail("Ese nombre de usuario ya está en uso.", { statusCode: 409, errorCode: "username_taken" });
        if (!quickChangeOpen) {
          usernameChangedAt = now;
          usernameQuickChangeUntil = new Date(nowMs + USERNAME_QUICK_CHANGE_MS).toISOString();
        }
      }
      const [updated] = await tx.update(schema.transerProfiles).set({
        username,
        usernameChangedAt,
        usernameQuickChangeUntil,
        displayName,
        description,
        secretDescription,
        avatarData,
        updatedAt: now,
      }).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).returning({
        username: schema.transerProfiles.username,
        usernameChangedAt: schema.transerProfiles.usernameChangedAt,
        usernameQuickChangeUntil: schema.transerProfiles.usernameQuickChangeUntil,
        displayName: schema.transerProfiles.displayName,
        description: schema.transerProfiles.description,
        secretDescription: schema.transerProfiles.secretDescription,
        avatarData: schema.transerProfiles.avatarData,
        updatedAt: schema.transerProfiles.updatedAt,
      });
      return updated;
    });
    const availableAt = profile.usernameChangedAt ? Date.parse(profile.usernameChangedAt) + USERNAME_COOLDOWN_MS : null;
    const quickChangeOpen = Boolean(profile.usernameQuickChangeUntil && Date.parse(profile.usernameQuickChangeUntil) > Date.now());
    return {
      profile,
      usernameCanChange: !profile.usernameChangedAt || quickChangeOpen || (availableAt !== null && Date.now() >= availableAt),
      usernameAvailableAt: availableAt === null ? null : new Date(availableAt).toISOString(),
    };
  },
});
