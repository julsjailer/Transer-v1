CREATE TABLE "bcard_scan_usage" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"day_key" text NOT NULL,
	"daily_scans" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" text,
	"mega_month_key" text NOT NULL,
	"monthly_mega_scans" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_store_listings" (
	"card_key" text PRIMARY KEY NOT NULL,
	"rarity" text NOT NULL,
	"price" integer NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_event_cards" (
	"event_id" text NOT NULL,
	"card_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_event_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"owner_email" text NOT NULL,
	"claimed_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"reward_type" text NOT NULL,
	"reward_key" text,
	"reward_quantity" integer DEFAULT 0 NOT NULL,
	"reward_zeny" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_follows" (
	"follower_email" text NOT NULL,
	"target_email" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_friend_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_email" text NOT NULL,
	"target_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_brother" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transer_event_cards" ADD CONSTRAINT "transer_event_cards_event_id_transer_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."transer_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transer_event_claims" ADD CONSTRAINT "transer_event_claims_event_id_transer_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."transer_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transer_event_card_unique" ON "transer_event_cards" USING btree ("event_id","card_key");--> statement-breakpoint
CREATE UNIQUE INDEX "transer_event_claim_unique" ON "transer_event_claims" USING btree ("owner_email","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transer_follow_unique" ON "transer_follows" USING btree ("follower_email","target_email");--> statement-breakpoint
CREATE UNIQUE INDEX "transer_friend_pair_unique" ON "transer_friend_requests" USING btree ("requester_email","target_email");