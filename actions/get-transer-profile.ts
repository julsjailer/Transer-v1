import { defineAction } from "@agent-native/core/action";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export default defineAction({
  description: "Read or initialize the signed-in user's private Transer profile.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    let [profile] = await db.select({
      username: schema.transerProfiles.username,
      usernameChangedAt: schema.transerProfiles.usernameChangedAt,
      usernameQuickChangeUntil: schema.transerProfiles.usernameQuickChangeUntil,
      level: schema.transerProfiles.level,
      experience: schema.transerProfiles.experience,
      displayName: schema.transerProfiles.displayName,
      description: schema.transerProfiles.description,
      secretDescription: schema.transerProfiles.secretDescription,
      avatarData: schema.transerProfiles.avatarData,
      updatedAt: schema.transerProfiles.updatedAt,
    }).from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).limit(1);
    if (!profile) {
      const base = ownerEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 20) || "netnav";
      await db.insert(schema.transerProfiles).values({
        ownerEmail,
        username: `${base}-${crypto.randomUUID().slice(0, 6)}`,
        displayName: base,
        description: "",
      }).onConflictDoNothing();
      [profile] = await db.select({
      username: schema.transerProfiles.username,
      usernameChangedAt: schema.transerProfiles.usernameChangedAt,
      usernameQuickChangeUntil: schema.transerProfiles.usernameQuickChangeUntil,
      level: schema.transerProfiles.level,
      experience: schema.transerProfiles.experience,
      displayName: schema.transerProfiles.displayName,
      description: schema.transerProfiles.description,
      secretDescription: schema.transerProfiles.secretDescription,
      avatarData: schema.transerProfiles.avatarData,
      updatedAt: schema.transerProfiles.updatedAt,
    }).from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).limit(1);
    }
    if (!profile) return { profile: null, email: ownerEmail, usernameCanChange: false, usernameAvailableAt: null };
    const brotherRows = await db.select({ requesterEmail: schema.transerFriendRequests.requesterEmail, targetEmail: schema.transerFriendRequests.targetEmail })
      .from(schema.transerFriendRequests)
      .where(and(
        eq(schema.transerFriendRequests.status, "accepted"),
        eq(schema.transerFriendRequests.isBrother, true),
        or(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail)),
      ));
    const activeBrotherCount = Math.min(6, brotherRows.length);
    const maxHp = 100 + Math.max(0, profile.level - 1) * 10 + activeBrotherCount * 5;
    const now = Date.now();
    const availableAt = profile.usernameChangedAt ? Date.parse(profile.usernameChangedAt) + USERNAME_COOLDOWN_MS : null;
    const quickChangeOpen = Boolean(profile.usernameQuickChangeUntil && Date.parse(profile.usernameQuickChangeUntil) > now);
    return {
      profile,
      email: ownerEmail,
      activeBrotherCount,
      maxHp,
      usernameCanChange: !profile.usernameChangedAt || quickChangeOpen || (availableAt !== null && now >= availableAt),
      usernameAvailableAt: availableAt === null ? null : new Date(availableAt).toISOString(),
    };
  },
});
