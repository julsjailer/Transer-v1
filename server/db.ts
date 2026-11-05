// App data layer — the DB client lives here.
//
// This starter ships without any tables, so the wiring is stubbed out. `getDb()`
// returns a Drizzle client bound to the app's `schema`. Enable it when you add
// your first table (see `drizzle/START_HERE.md`):
//
//   1. Define tables in `drizzle/schema.ts`.
//   2. Uncomment the lines below, run `pnpm db:generate`, then `pnpm db:migrate`
//      to apply the new migration. (drizzle-orm, drizzle-kit, drizzle.config.ts,
//      and the db:generate/db:migrate scripts already ship.)
//
// import { createGetDb } from "@agent-native/core/db";
// import { registerShareableResource } from "@agent-native/core/sharing";
// import * as schema from "../drizzle/schema";
//
// export const getDb = createGetDb(schema);
// export { schema };
//
// // Lets accessFilter/assertAccess and the share actions resolve "note" rows.
// registerShareableResource({
//   type: "note",
//   resourceTable: schema.notes,
//   sharesTable: schema.noteShares,
//   displayName: "Note",
//   titleColumn: "title",
//   getResourcePath: (note) => `/notes/${note.id}`,
//   getDb,
// });

import { createGetDb } from "@agent-native/core/db";
import { registerIdentityColumns } from "@agent-native/core/org";
import * as schema from "../drizzle/schema";

export const getDb = createGetDb(schema);
export { schema };

registerIdentityColumns([
  { table: "bcard_inventory", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Private card inventory belongs to the account owner." },
  { table: "bcard_folders", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Private card folders belong to the account owner." },
  { table: "bcard_folder_cards", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Folder membership belongs to the account owner." },
  { table: "bcard_favorites", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Profile favorites belong to the account owner." },
  { table: "bcard_profile_settings", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Collection visibility belongs to the account owner." },
  { table: "bcard_pack_claims", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Pack cooldowns belong to the account owner." },
  { table: "bcard_mission_claims", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Mission claims belong to the account owner." },
  { table: "bcard_reward_events", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Reward history belongs to the account owner." },
  { table: "bcard_items", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Game items belong to the account owner." },
  { table: "transer_profiles", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Profile data belongs to the account owner." },
  { table: "zeny_accounts", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Zeny balances belong to the account owner." },
  { table: "zeny_transactions", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Zeny ledger belongs to the account owner." },
  { table: "mail_messages", column: "sender_email", emailChange: "rekey", offboard: "delete", reason: "Sent messages belong to the sender account." },
  { table: "mail_messages", column: "recipient_email", emailChange: "rekey", offboard: "delete", reason: "Received messages belong to the recipient account." },
  { table: "bcard_catalog_pdf_settings", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Catalog publication preferences belong to the creator account." },
  { table: "bcard_discoveries", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Cardex discoveries belong to the account owner." },
  { table: "bcard_cardex_identifications", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Cardex identification history belongs to the account owner." },
  { table: "bcard_scan_usage", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Cardex scan limits belong to the account owner." },
  { table: "transer_store_purchases", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Store purchase records belong to the account owner." },
  { table: "bcard_item_uses", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "Item use history belongs to the account owner." },
  { table: "bcard_store_listings", column: "updated_by", emailChange: "rekey", offboard: "retain", reason: "Store listings retain their last administrator identity." },
  { table: "transer_events", column: "created_by", emailChange: "rekey", offboard: "retain", reason: "Published events retain their creator identity." },
  { table: "transer_friend_requests", column: "requester_email", emailChange: "rekey", offboard: "delete", reason: "Friend requests belong to their requesting account." },
  { table: "transer_friend_requests", column: "target_email", emailChange: "rekey", offboard: "delete", reason: "Friend requests target this account." },
  { table: "transer_follows", column: "follower_email", emailChange: "rekey", offboard: "delete", reason: "Follow relationships belong to their follower." },
  { table: "transer_follows", column: "target_email", emailChange: "rekey", offboard: "delete", reason: "Follow relationships reference this account." },
  { table: "bcard_catalog_publication", column: "updated_by", emailChange: "rekey", offboard: "delete", reason: "Catalog publication is controlled by the configured creator." },
  { table: "zeny_redemption_codes", column: "created_by", emailChange: "rekey", offboard: "delete", reason: "Unused reward codes are owned by their creator." },
  { table: "zeny_redemption_codes", column: "redeemed_by", emailChange: "rekey", offboard: "retain", reason: "Redemption audit records retain the one-time redemption owner." },
  { table: "zeny_code_audit", column: "created_by", emailChange: "rekey", offboard: "delete", reason: "Reward-code audit records belong to their creator." },
  { table: "transer_creator_owner", column: "owner_email", emailChange: "rekey", offboard: "delete", reason: "The primary creator role belongs to the configured account." },
  { table: "transer_creator_admins", column: "user_email", emailChange: "rekey", offboard: "delete", reason: "Delegated creator permissions belong to the delegated account." },
  { table: "transer_creator_admins", column: "granted_by", emailChange: "rekey", offboard: "retain", reason: "Delegation history retains the identity of the granting account." },
]);
