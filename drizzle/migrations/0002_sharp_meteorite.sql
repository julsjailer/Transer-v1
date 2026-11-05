CREATE TABLE "bcard_discoveries" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"card_key" text NOT NULL,
	"source" text NOT NULL,
	"discovered_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_discovery_owner_card_unique" ON "bcard_discoveries" USING btree ("owner_email","card_key");