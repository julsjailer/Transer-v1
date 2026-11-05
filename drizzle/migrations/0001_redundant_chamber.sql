CREATE TABLE "bcard_catalog_pdf_settings" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_catalog_publication" (
	"card_key" text PRIMARY KEY NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcard_items" (
	"owner_email" text NOT NULL,
	"item_key" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"attachment_type" text NOT NULL,
	"reference_key" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"image_data" text
);
--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_email" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_profiles" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"avatar_data" text,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "transer_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "zeny_accounts" (
	"owner_email" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 10 NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zeny_code_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zeny_redemption_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"amount" integer NOT NULL,
	"created_by" text NOT NULL,
	"redeemed_by" text,
	"redeemed_at" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zeny_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"source_key" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_attachments" ADD CONSTRAINT "mail_attachments_message_id_mail_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mail_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_items_owner_item_unique" ON "bcard_items" USING btree ("owner_email","item_key");--> statement-breakpoint
CREATE UNIQUE INDEX "zeny_transactions_owner_source_unique" ON "zeny_transactions" USING btree ("owner_email","source","source_key");