UPDATE "bcard_pack_claims"
SET "next_claim_at" = (("last_claimed_at"::timestamptz + interval '12 hours')::text);
