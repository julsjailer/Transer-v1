CREATE TABLE "bcard_cardex_identifications" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"card_key" text NOT NULL,
	"identified_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transer_profiles" ADD COLUMN "secret_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bcard_cardex_identification_owner_card_unique" ON "bcard_cardex_identifications" USING btree ("owner_email","card_key");