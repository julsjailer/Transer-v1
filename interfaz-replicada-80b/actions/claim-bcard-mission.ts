import { defineAction, fail } from "@agent-native/core/action";
import { and, count, countDistinct, eq, gte, or, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { BCARD_MISSIONS, getBcardMissionPeriodKey } from "../app/lib/bcard-missions";
import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { drawBcardKeys, requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Claim a daily mission reward after the server verifies its account activity.",
  schema: z.object({ missionKey: z.string() }),
  run: async ({ missionKey }) => {
    const ownerEmail = requireBcardOwner();
    const mission = BCARD_MISSIONS.find((candidate) => candidate.key === missionKey);
    if (!mission) fail("La misión no existe.", { statusCode: 404, errorCode: "mission_not_found" });
    const now = new Date();
    const nowIso = now.toISOString();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const periodKey = getBcardMissionPeriodKey(mission, now);
    const rewardKeys = drawBcardKeys(mission.rewardCards);
    const db = getDb();

    return db.transaction(async (tx) => {
      const [packRows, copiesRows, discoveryRows, favoritesRows, foldersRows, organizedRows, giftRows, redemptionRows, storeRows, itemUseRows, followRows, brotherRows, requestRows] = await Promise.all([
        tx.select({ value: count() }).from(schema.bcardPackClaims).where(and(eq(schema.bcardPackClaims.ownerEmail, ownerEmail), gte(schema.bcardPackClaims.lastClaimedAt, dayStart))),
        tx.select({ value: sum(schema.bcardInventory.quantity) }).from(schema.bcardInventory).where(eq(schema.bcardInventory.ownerEmail, ownerEmail)),
        tx.select({ value: countDistinct(schema.bcardDiscoveries.cardKey) }).from(schema.bcardDiscoveries).where(and(eq(schema.bcardDiscoveries.ownerEmail, ownerEmail), gte(schema.bcardDiscoveries.discoveredAt, dayStart))),
        tx.select({ value: count() }).from(schema.bcardFavorites).where(eq(schema.bcardFavorites.ownerEmail, ownerEmail)),
        tx.select({ value: count() }).from(schema.bcardFolders).where(and(eq(schema.bcardFolders.ownerEmail, ownerEmail), gte(schema.bcardFolders.createdAt, dayStart))),
        tx.select({ value: count() }).from(schema.bcardFolderCards).where(and(eq(schema.bcardFolderCards.ownerEmail, ownerEmail), gte(schema.bcardFolderCards.createdAt, dayStart))),
        tx.select({ value: count() }).from(schema.mailMessages).where(and(eq(schema.mailMessages.senderEmail, ownerEmail), gte(schema.mailMessages.createdAt, dayStart))),
        tx.select({ value: count() }).from(schema.zenyTransactions).where(and(eq(schema.zenyTransactions.ownerEmail, ownerEmail), eq(schema.zenyTransactions.source, "code"), gte(schema.zenyTransactions.createdAt, dayStart))),
        tx.select({ value: count() }).from(schema.transerStorePurchases).where(and(eq(schema.transerStorePurchases.ownerEmail, ownerEmail), gte(schema.transerStorePurchases.purchasedAt, dayStart))),
        tx.select({ value: count() }).from(schema.bcardItemUses).where(and(eq(schema.bcardItemUses.ownerEmail, ownerEmail), gte(schema.bcardItemUses.usedAt, dayStart))),
        tx.select({ value: count() }).from(schema.transerFollows).where(and(eq(schema.transerFollows.followerEmail, ownerEmail), gte(schema.transerFollows.createdAt, dayStart))),
        tx.select({ requesterEmail: schema.transerFriendRequests.requesterEmail, targetEmail: schema.transerFriendRequests.targetEmail }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.status, "accepted"), eq(schema.transerFriendRequests.isBrother, true), or(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail)))),
        tx.select({ value: count() }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), gte(schema.transerFriendRequests.createdAt, dayStart))),
      ]);
      const progressByKey: Record<(typeof BCARD_MISSIONS)[number]["progressKey"], number> = {
        "packs-today": Number(packRows[0]?.value ?? 0),
        "inventory-copies": Number(copiesRows[0]?.value ?? 0),
        "discoveries-today": Number(discoveryRows[0]?.value ?? 0),
        favorites: Number(favoritesRows[0]?.value ?? 0),
        "folders-today": Number(foldersRows[0]?.value ?? 0),
        "organized-today": Number(organizedRows[0]?.value ?? 0),
        "gifts-today": Number(giftRows[0]?.value ?? 0),
        "redemptions-today": Number(redemptionRows[0]?.value ?? 0),
        "purchases-today": Number(storeRows[0]?.value ?? 0),
        "hourglasses-used-today": Number(itemUseRows[0]?.value ?? 0),
        "follows-today": Number(followRows[0]?.value ?? 0),
        brothers: Math.min(6, brotherRows.length),
        "requests-today": Number(requestRows[0]?.value ?? 0),
      };
      const progress = progressByKey[mission.progressKey];
      if (progress < mission.target) fail("Todavía no has completado el objetivo de esta misión.", { errorCode: "mission_incomplete", details: { missionKey, target: mission.target, progress } });
      const [claimed] = await tx.insert(schema.bcardMissionClaims).values({ id: crypto.randomUUID(), ownerEmail, missionKey, periodKey }).onConflictDoNothing().returning({ id: schema.bcardMissionClaims.id });
      if (!claimed) fail("Ya reclamaste esta recompensa para el día actual.", { statusCode: 409, errorCode: "mission_already_claimed" });

      const existing = await tx.select({ cardKey: schema.bcardInventory.cardKey }).from(schema.bcardInventory).where(eq(schema.bcardInventory.ownerEmail, ownerEmail));
      const existingKeys = new Set(existing.map((row) => row.cardKey));
      const quantities = new Map<string, number>();
      for (const key of rewardKeys) quantities.set(key, (quantities.get(key) ?? 0) + 1);
      const cards = [...quantities].map(([cardKey, quantity]) => ({ cardKey, quantity, isNew: !existingKeys.has(cardKey), card: CARTA_POR_CLAVE.get(cardKey)! }));
      if (cards.length) {
        await tx.insert(schema.bcardRewardEvents).values(cards.map(({ cardKey, quantity }) => ({ id: crypto.randomUUID(), ownerEmail, sourceType: "mission", sourceKey: `${missionKey}:${periodKey}`, cardKey, quantity })));
        await tx.insert(schema.bcardInventory).values(cards.map(({ cardKey, quantity }) => ({ id: crypto.randomUUID(), ownerEmail, cardKey, quantity }))).onConflictDoUpdate({
          target: [schema.bcardInventory.ownerEmail, schema.bcardInventory.cardKey],
          set: { quantity: sql`${schema.bcardInventory.quantity} + excluded.quantity`, updatedAt: nowIso },
        });
      }
      if (mission.rewardHourglasses > 0) await tx.insert(schema.bcardItems).values({ ownerEmail, itemKey: "hourglass", quantity: mission.rewardHourglasses, updatedAt: nowIso }).onConflictDoUpdate({
        target: [schema.bcardItems.ownerEmail, schema.bcardItems.itemKey],
        set: { quantity: sql`${schema.bcardItems.quantity} + excluded.quantity`, updatedAt: nowIso },
      });
      if (mission.rewardZeny > 0) {
        await tx.insert(schema.zenyAccounts).values({ ownerEmail, balance: mission.rewardZeny, updatedAt: nowIso }).onConflictDoUpdate({ target: schema.zenyAccounts.ownerEmail, set: { balance: sql`${schema.zenyAccounts.balance} + ${mission.rewardZeny}`, updatedAt: nowIso } });
        await tx.insert(schema.zenyTransactions).values({ id: crypto.randomUUID(), ownerEmail, amount: mission.rewardZeny, source: "mission", sourceKey: `${missionKey}:${periodKey}`, createdAt: nowIso });
      }
      const [profile] = await tx.select({ experience: schema.transerProfiles.experience }).from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).for("update").limit(1);
      if (!profile) fail("No se encontró el perfil de progresión.", { statusCode: 404, errorCode: "profile_not_found" });
      const experience = profile.experience + mission.rewardExperience;
      const level = 1 + Math.floor(experience / 100);
      await tx.update(schema.transerProfiles).set({ experience, level, updatedAt: nowIso }).where(eq(schema.transerProfiles.ownerEmail, ownerEmail));
      return { missionKey, periodKey, cards, newCards: cards.filter((card) => card.isNew), repeatedCards: cards.filter((card) => !card.isNew), items: [{ itemKey: "hourglass", quantity: mission.rewardHourglasses }], rewardExperience: mission.rewardExperience, level, experience, rewardZeny: mission.rewardZeny };
    });
  },
});
