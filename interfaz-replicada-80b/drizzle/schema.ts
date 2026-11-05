// App tables live here, defined with Drizzle's PostgreSQL builders. Local dev
// runs them on PGlite and hosted deploys on Postgres.
//
// After editing this file, run `pnpm db:generate` and restart the dev server
// (see `drizzle/START_HERE.md`). Example table, private to its creator unless
// shared (see the `sharing` skill) — uncomment and adapt:
//
// import { sql } from "drizzle-orm";
// import { boolean, pgTable, text } from "drizzle-orm/pg-core";
// import {
//   createSharesTable,
//   ownableColumns,
// } from "@agent-native/core/db/schema";
//
// export const notes = pgTable("notes", {
//   id: text("id").primaryKey(),
//   title: text("title").notNull(),
//   body: text("body").notNull().default(""),
//   archived: boolean("archived").notNull().default(false),
//   createdAt: text("created_at").notNull().default(sql`now()`),
//   updatedAt: text("updated_at").notNull().default(sql`now()`),
//   ...ownableColumns(),
// });
//
// export const noteShares = createSharesTable("note_shares");

import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const bcardInventory = pgTable("bcard_inventory", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  cardKey: text("card_key").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
}, (table) => ({ ownerCardUnique: uniqueIndex("bcard_inventory_owner_card_unique").on(table.ownerEmail, table.cardKey) }));

export const bcardFolders = pgTable("bcard_folders", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  cardCount: integer("card_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const bcardFolderCards = pgTable("bcard_folder_cards", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  folderId: text("folder_id").notNull().references(() => bcardFolders.id, { onDelete: "cascade" }),
  cardKey: text("card_key").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
}, (table) => ({ folderCardUnique: uniqueIndex("bcard_folder_card_unique").on(table.ownerEmail, table.folderId, table.cardKey) }));

export const bcardFavorites = pgTable("bcard_favorites", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  slot: integer("slot").notNull(),
  cardKey: text("card_key").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  ownerSlotUnique: uniqueIndex("bcard_favorite_owner_slot_unique").on(table.ownerEmail, table.slot),
  ownerCardUnique: uniqueIndex("bcard_favorite_owner_card_unique").on(table.ownerEmail, table.cardKey),
}));

export const bcardProfileSettings = pgTable("bcard_profile_settings", {
  ownerEmail: text("owner_email").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  collectionPublic: boolean("collection_public").notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const bcardPackClaims = pgTable("bcard_pack_claims", {
  ownerEmail: text("owner_email").primaryKey(),
  lastClaimedAt: text("last_claimed_at").notNull(),
  nextClaimAt: text("next_claim_at").notNull(),
});

export const bcardMissionClaims = pgTable("bcard_mission_claims", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  missionKey: text("mission_key").notNull(),
  periodKey: text("period_key").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
}, (table) => ({ ownerMissionPeriodUnique: uniqueIndex("bcard_mission_claim_unique").on(table.ownerEmail, table.missionKey, table.periodKey) }));

export const bcardRewardEvents = pgTable("bcard_reward_events", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  sourceType: text("source_type").notNull(),
  sourceKey: text("source_key").notNull(),
  cardKey: text("card_key").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
}, (table) => ({ rewardSourceUnique: uniqueIndex("bcard_reward_source_unique").on(table.ownerEmail, table.sourceType, table.sourceKey, table.cardKey) }));

export const bcardItems = pgTable("bcard_items", {
  ownerEmail: text("owner_email").notNull(),
  itemKey: text("item_key").notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
}, (table) => ({ ownerItemUnique: uniqueIndex("bcard_items_owner_item_unique").on(table.ownerEmail, table.itemKey) }));

export const bcardScanUsage = pgTable("bcard_scan_usage", {
  ownerEmail: text("owner_email").primaryKey(),
  dayKey: text("day_key").notNull(),
  dailyScans: integer("daily_scans").notNull().default(0),
  lastScannedAt: text("last_scanned_at"),
  megaMonthKey: text("mega_month_key").notNull(),
  monthlyMegaScans: integer("monthly_mega_scans").notNull().default(0),
});

export const bcardStoreListings = pgTable("bcard_store_listings", {
  cardKey: text("card_key").primaryKey(),
  productType: text("product_type").notNull().default("card"),
  productKey: text("product_key").notNull().default(""),
  rarity: text("rarity").notNull(),
  price: integer("price").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
}, (table) => ({ productUnique: uniqueIndex("bcard_store_product_unique").on(table.productType, table.productKey) }));

export const transerStorePurchases = pgTable("transer_store_purchases", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  productType: text("product_type").notNull(),
  productKey: text("product_key").notNull(),
  price: integer("price").notNull(),
  purchasedAt: text("purchased_at").notNull().default(sql`now()`),
});

export const bcardItemUses = pgTable("bcard_item_uses", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  itemKey: text("item_key").notNull(),
  usedAt: text("used_at").notNull().default(sql`now()`),
});

export const transerEvents = pgTable("transer_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  rewardType: text("reward_type").notNull(),
  rewardKey: text("reward_key"),
  rewardQuantity: integer("reward_quantity").notNull().default(0),
  rewardZeny: integer("reward_zeny").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const transerEventCards = pgTable("transer_event_cards", {
  eventId: text("event_id").notNull().references(() => transerEvents.id, { onDelete: "cascade" }),
  cardKey: text("card_key").notNull(),
}, (table) => ({ eventCardUnique: uniqueIndex("transer_event_card_unique").on(table.eventId, table.cardKey) }));

export const transerEventClaims = pgTable("transer_event_claims", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => transerEvents.id, { onDelete: "cascade" }),
  ownerEmail: text("owner_email").notNull(),
  claimedAt: text("claimed_at").notNull().default(sql`now()`),
}, (table) => ({ ownerEventUnique: uniqueIndex("transer_event_claim_unique").on(table.ownerEmail, table.eventId) }));

export const transerFriendRequests = pgTable("transer_friend_requests", {
  id: text("id").primaryKey(),
  requesterEmail: text("requester_email").notNull(),
  targetEmail: text("target_email").notNull(),
  status: text("status").notNull().default("pending"),
  isBrother: boolean("is_brother").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
}, (table) => ({ friendPairUnique: uniqueIndex("transer_friend_pair_unique").on(table.requesterEmail, table.targetEmail) }));

export const transerFollows = pgTable("transer_follows", {
  followerEmail: text("follower_email").notNull(),
  targetEmail: text("target_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
}, (table) => ({ followUnique: uniqueIndex("transer_follow_unique").on(table.followerEmail, table.targetEmail) }));

export const transerProfiles = pgTable("transer_profiles", {
  ownerEmail: text("owner_email").primaryKey(),
  username: text("username").notNull().unique(),
  usernameChangedAt: text("username_changed_at"),
  usernameQuickChangeUntil: text("username_quick_change_until"),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  displayName: text("display_name").notNull(),
  description: text("description").notNull().default(""),
  avatarData: text("avatar_data"),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const zenyAccounts = pgTable("zeny_accounts", {
  ownerEmail: text("owner_email").primaryKey(),
  balance: integer("balance").notNull().default(10),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const zenyTransactions = pgTable("zeny_transactions", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  amount: integer("amount").notNull(),
  source: text("source").notNull(),
  sourceKey: text("source_key").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
}, (table) => ({ ownerSourceUnique: uniqueIndex("zeny_transactions_owner_source_unique").on(table.ownerEmail, table.source, table.sourceKey) }));

export const zenyRedemptionCodes = pgTable("zeny_redemption_codes", {
  codeHash: text("code_hash").primaryKey(),
  amount: integer("amount").notNull(),
  createdBy: text("created_by").notNull(),
  redeemedBy: text("redeemed_by"),
  redeemedAt: text("redeemed_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const mailMessages = pgTable("mail_messages", {
  id: text("id").primaryKey(),
  senderEmail: text("sender_email").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull().default(""),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const mailAttachments = pgTable("mail_attachments", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().references(() => mailMessages.id, { onDelete: "cascade" }),
  attachmentType: text("attachment_type").notNull(),
  referenceKey: text("reference_key"),
  quantity: integer("quantity").notNull().default(1),
  imageData: text("image_data"),
});

export const bcardCatalogPublication = pgTable("bcard_catalog_publication", {
  cardKey: text("card_key").primaryKey(),
  isPublic: boolean("is_public").notNull().default(false),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const bcardCatalogPdfSettings = pgTable("bcard_catalog_pdf_settings", {
  ownerEmail: text("owner_email").primaryKey(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const bcardDiscoveries = pgTable("bcard_discoveries", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  cardKey: text("card_key").notNull(),
  source: text("source").notNull(),
  discoveredAt: text("discovered_at").notNull().default(sql`now()`),
}, (table) => ({ ownerCardUnique: uniqueIndex("bcard_discovery_owner_card_unique").on(table.ownerEmail, table.cardKey) }));

export const zenyCodeAudit = pgTable("zeny_code_audit", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull(),
  createdBy: text("created_by").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const transerCreatorOwner = pgTable("transer_creator_owner", {
  id: text("id").primaryKey().default("primary"),
  ownerEmail: text("owner_email").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const transerCreatorAdmins = pgTable("transer_creator_admins", {
  userEmail: text("user_email").primaryKey(),
  grantedBy: text("granted_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});
