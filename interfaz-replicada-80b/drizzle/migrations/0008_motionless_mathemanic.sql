CREATE TABLE "bcard_item_uses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"item_key" text NOT NULL,
	"used_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_store_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"product_type" text NOT NULL,
	"product_key" text NOT NULL,
	"price" integer NOT NULL,
	"purchased_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bcard_store_listings" ADD COLUMN "product_type" text DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "bcard_store_listings" ADD COLUMN "product_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "transer_profiles" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "transer_profiles" ADD COLUMN "experience" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_store_product_unique" ON "bcard_store_listings" USING btree ("product_type","product_key");