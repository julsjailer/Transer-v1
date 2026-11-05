CREATE TABLE "bcard_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"slot" integer NOT NULL,
	"card_key" text NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_folder_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"folder_id" text NOT NULL,
	"card_key" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"card_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"card_key" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_mission_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"mission_key" text NOT NULL,
	"period_key" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_pack_claims" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"last_claimed_at" text NOT NULL,
	"next_claim_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_profile_settings" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"collection_public" boolean DEFAULT false NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "bcard_profile_settings_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "bcard_reward_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"source_type" text NOT NULL,
	"source_key" text NOT NULL,
	"card_key" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bcard_folder_cards" ADD CONSTRAINT "bcard_folder_cards_folder_id_bcard_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."bcard_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_favorite_owner_slot_unique" ON "bcard_favorites" USING btree ("owner_email","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_favorite_owner_card_unique" ON "bcard_favorites" USING btree ("owner_email","card_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_folder_card_unique" ON "bcard_folder_cards" USING btree ("owner_email","folder_id","card_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_inventory_owner_card_unique" ON "bcard_inventory" USING btree ("owner_email","card_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_mission_claim_unique" ON "bcard_mission_claims" USING btree ("owner_email","mission_key","period_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_reward_source_unique" ON "bcard_reward_events" USING btree ("owner_email","source_type","source_key","card_key");