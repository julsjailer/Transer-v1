import { defineAction } from "@agent-native/core/action";
import { and, count, countDistinct, eq, gte, or } from "drizzle-orm";
import { z } from "zod";

import { BCARD_MISSIONS, BCARD_PACK_COOLDOWN_HOURS, BCARD_PACK_SIZE, getBcardMissionPeriodKey } from "../app/lib/bcard-missions";
import { CARTA_POR_CLAVE } from "../app/lib/cartas";
import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Read the signed-in user's collection, item inventory, scan limits, daily missions, and Zeny balance.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.zenyAccounts).values({ ownerEmail }).onConflictDoNothing().returning({ ownerEmail: schema.zenyAccounts.ownerEmail });
      if (created) await tx.insert(schema.zenyTransactions).values({ id: crypto.randomUUID(), ownerEmail, amount: 10, source: "initial", sourceKey: "account-created" });
    });
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const dayKey = todayStart.slice(0, 10);
    const monthKey = dayKey.slice(0, 7);
    const [inventory, folders, folderCards, favorites, profileRows, progressionRows, packRows, missionClaims, discoveries, items, zenyRows, scanRows, dailyDiscoveryRows, giftRows, redemptionRows, storePurchaseRows, itemUseRows, followRows, requestRows, brotherRows] = await Promise.all([
      db.select({ cardKey: schema.bcardInventory.cardKey, quantity: schema.bcardInventory.quantity, updatedAt: schema.bcardInventory.updatedAt }).from(schema.bcardInventory).where(eq(schema.bcardInventory.ownerEmail, ownerEmail)),
      db.select({ id: schema.bcardFolders.id, name: schema.bcardFolders.name, cardCount: schema.bcardFolders.cardCount, createdAt: schema.bcardFolders.createdAt }).from(schema.bcardFolders).where(eq(schema.bcardFolders.ownerEmail, ownerEmail)),
      db.select({ folderId: schema.bcardFolderCards.folderId, cardKey: schema.bcardFolderCards.cardKey, createdAt: schema.bcardFolderCards.createdAt }).from(schema.bcardFolderCards).where(eq(schema.bcardFolderCards.ownerEmail, ownerEmail)),
      db.select({ slot: schema.bcardFavorites.slot, cardKey: schema.bcardFavorites.cardKey }).from(schema.bcardFavorites).where(eq(schema.bcardFavorites.ownerEmail, ownerEmail)),
      db.select({ collectionPublic: schema.bcardProfileSettings.collectionPublic, publicId: schema.bcardProfileSettings.publicId }).from(schema.bcardProfileSettings).where(eq(schema.bcardProfileSettings.ownerEmail, ownerEmail)).limit(1),
      db.select({ level: schema.transerProfiles.level }).from(schema.transerProfiles).where(eq(schema.transerProfiles.ownerEmail, ownerEmail)).limit(1),
      db.select({ lastClaimedAt: schema.bcardPackClaims.lastClaimedAt, nextClaimAt: schema.bcardPackClaims.nextClaimAt }).from(schema.bcardPackClaims).where(eq(schema.bcardPackClaims.ownerEmail, ownerEmail)).limit(1),
      db.select({ missionKey: schema.bcardMissionClaims.missionKey, periodKey: schema.bcardMissionClaims.periodKey }).from(schema.bcardMissionClaims).where(eq(schema.bcardMissionClaims.ownerEmail, ownerEmail)),
      db.select({ cardKey: schema.bcardDiscoveries.cardKey, discoveredAt: schema.bcardDiscoveries.discoveredAt }).from(schema.bcardDiscoveries).where(eq(schema.bcardDiscoveries.ownerEmail, ownerEmail)),
      db.select({ itemKey: schema.bcardItems.itemKey, quantity: schema.bcardItems.quantity }).from(schema.bcardItems).where(eq(schema.bcardItems.ownerEmail, ownerEmail)),
      db.select({ balance: schema.zenyAccounts.balance }).from(schema.zenyAccounts).where(eq(schema.zenyAccounts.ownerEmail, ownerEmail)).limit(1),
      db.select().from(schema.bcardScanUsage).where(eq(schema.bcardScanUsage.ownerEmail, ownerEmail)).limit(1),
      db.select({ value: count() }).from(schema.bcardDiscoveries).where(and(eq(schema.bcardDiscoveries.ownerEmail, ownerEmail), gte(schema.bcardDiscoveries.discoveredAt, todayStart))),
      db.select({ value: count() }).from(schema.mailMessages).where(and(eq(schema.mailMessages.senderEmail, ownerEmail), gte(schema.mailMessages.createdAt, todayStart))),
      db.select({ value: count() }).from(schema.zenyTransactions).where(and(eq(schema.zenyTransactions.ownerEmail, ownerEmail), eq(schema.zenyTransactions.source, "code"), gte(schema.zenyTransactions.createdAt, todayStart))),
      db.select({ value: count() }).from(schema.transerStorePurchases).where(and(eq(schema.transerStorePurchases.ownerEmail, ownerEmail), gte(schema.transerStorePurchases.purchasedAt, todayStart))),
      db.select({ value: count() }).from(schema.bcardItemUses).where(and(eq(schema.bcardItemUses.ownerEmail, ownerEmail), eq(schema.bcardItemUses.itemKey, "hourglass"), gte(schema.bcardItemUses.usedAt, todayStart))),
      db.select({ value: count() }).from(schema.transerFollows).where(and(eq(schema.transerFollows.followerEmail, ownerEmail), gte(schema.transerFollows.createdAt, todayStart))),
      db.select({ value: count() }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), gte(schema.transerFriendRequests.createdAt, todayStart))),
      db.select({ requesterEmail: schema.transerFriendRequests.requesterEmail, targetEmail: schema.transerFriendRequests.targetEmail }).from(schema.transerFriendRequests).where(and(eq(schema.transerFriendRequests.status, "accepted"), eq(schema.transerFriendRequests.isBrother, true), or(eq(schema.transerFriendRequests.requesterEmail, ownerEmail), eq(schema.transerFriendRequests.targetEmail, ownerEmail)))),
    ]);
    const nowIso = now.toISOString();
    const pack = packRows[0] ?? null;
    const scan = scanRows[0] ?? null;
    const dailyScans = scan?.dayKey === dayKey ? scan.dailyScans : 0;
    const megaScans = scan?.megaMonthKey === monthKey ? scan.monthlyMegaScans : 0;
    const inventoryCopies = inventory.reduce((total, row) => total + row.quantity, 0);
    const inventoryByKey = new Map(inventory.map((row) => [row.cardKey, row.quantity]));
    const activeBrotherCount = Math.min(6, brotherRows.length);
    const metric: Record<(typeof BCARD_MISSIONS)[number]["progressKey"], number> = {
      "packs-today": Number(pack?.lastClaimedAt.slice(0, 10) === dayKey),
      "inventory-copies": inventoryCopies,
      "discoveries-today": Number(dailyDiscoveryRows[0]?.value ?? 0),
      favorites: favorites.length,
      "folders-today": folders.filter((folder) => folder.createdAt >= todayStart).length,
      "organized-today": folderCards.filter((card) => card.createdAt >= todayStart).length,
      "gifts-today": Number(giftRows[0]?.value ?? 0),
      "redemptions-today": Number(redemptionRows[0]?.value ?? 0),
      "purchases-today": Number(storePurchaseRows[0]?.value ?? 0),
      "hourglasses-used-today": Number(itemUseRows[0]?.value ?? 0),
      "follows-today": Number(followRows[0]?.value ?? 0),
      brothers: activeBrotherCount,
      "requests-today": Number(requestRows[0]?.value ?? 0),
    };
    const missions = BCARD_MISSIONS.map((mission) => {
      const periodKey = getBcardMissionPeriodKey(mission, now);
      const progress = Math.min(mission.target, metric[mission.progressKey]);
      return { ...mission, progress, completed: progress >= mission.target, claimed: missionClaims.some((claim) => claim.missionKey === mission.key && claim.periodKey === periodKey) };
    });
    return {
      items,
      discoveries: discoveries.map((row) => ({ ...row, ...CARTA_POR_CLAVE.get(row.cardKey) })),
      zenyBalance: zenyRows[0]?.balance ?? 10,
      progression: { level: progressionRows[0]?.level ?? 1, maxHp: 100 + Math.max(0, (progressionRows[0]?.level ?? 1) - 1) * 10 + activeBrotherCount * 5, activeBrotherCount },
      scanLimits: {
        dailyRemaining: Math.max(0, 5 - dailyScans),
        nextScanAt: scan?.lastScannedAt && now.getTime() - Date.parse(scan.lastScannedAt) < 4 * 60 * 60 * 1000 ? new Date(Date.parse(scan.lastScannedAt) + 4 * 60 * 60 * 1000).toISOString() : null,
        megaRemaining: Math.max(0, 3 - megaScans),
      },
      inventory: inventory.flatMap((row) => { const card = CARTA_POR_CLAVE.get(row.cardKey); return card ? [{ ...card, cardKey: row.cardKey, quantity: row.quantity, updatedAt: row.updatedAt }] : []; }),
      folders: folders.map((folder) => ({ ...folder, cards: folderCards.filter((row) => row.folderId === folder.id).flatMap((row) => { const card = CARTA_POR_CLAVE.get(row.cardKey); return card ? [{ ...card, cardKey: row.cardKey, quantity: inventoryByKey.get(row.cardKey) ?? 0 }] : []; }) })),
      favorites: favorites.sort((a, b) => a.slot - b.slot).map((favorite) => { const card = CARTA_POR_CLAVE.get(favorite.cardKey); return card ? { ...card, cardKey: favorite.cardKey, slot: favorite.slot } : null; }).filter((favorite) => favorite !== null),
      collectionPublic: profileRows[0]?.collectionPublic ?? false,
      publicId: profileRows[0]?.publicId ?? null,
      pack: { size: BCARD_PACK_SIZE, cooldownHours: BCARD_PACK_COOLDOWN_HOURS, nextClaimAt: pack?.nextClaimAt ?? null, available: !pack || new Date(pack.nextClaimAt).getTime() <= now.getTime() },
      missions,
      inventoryCopies,
      discoveriesTotal: discoveries.length,
      updatedAt: nowIso,
    };
  },
});
