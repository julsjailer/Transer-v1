CREATE TABLE "transer_creator_admins" (
	"user_email" text PRIMARY KEY NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transer_creator_owner" (
	"id" text PRIMARY KEY DEFAULT 'primary' NOT NULL,
	"owner_email" text NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
