import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { hashZenyCode } from "../server/transer-creator.js";
import { requireBcardOwner } from "../server/bcard.js";

export default defineAction({
  description: "Redeem a single-use internal Zeny code for the signed-in account.",
  schema: z.object({ code: z.string().trim().regex(/^[A-Z0-9-]{8,32}$/i) }),
  run: async ({ code }) => {
    const ownerEmail = requireBcardOwner();
    const now = new Date().toISOString();
    const codeHash = hashZenyCode(code);
    return getDb().transaction(async (tx) => {
      const [redemption] = await tx.select().from(schema.zenyRedemptionCodes).where(eq(schema.zenyRedemptionCodes.codeHash, codeHash)).for("update");
      if (!redemption || redemption.redeemedBy) fail("El código no existe o ya fue utilizado.", { statusCode: 409, errorCode: "code_unavailable" });
      const [used] = await tx.update(schema.zenyRedemptionCodes).set({ redeemedBy: ownerEmail, redeemedAt: now }).where(and(
        eq(schema.zenyRedemptionCodes.codeHash, codeHash),
        isNull(schema.zenyRedemptionCodes.redeemedBy),
      )).returning({ codeHash: schema.zenyRedemptionCodes.codeHash });
      if (!used) fail("El código no existe o ya fue utilizado.", { statusCode: 409, errorCode: "code_unavailable" });
      const [created] = await tx.insert(schema.zenyAccounts).values({ ownerEmail }).onConflictDoNothing().returning({ ownerEmail: schema.zenyAccounts.ownerEmail });
      if (created) await tx.insert(schema.zenyTransactions).values({ id: crypto.randomUUID(), ownerEmail, amount: 10, source: "initial", sourceKey: "account-created", createdAt: now });
      await tx.insert(schema.zenyTransactions).values({ id: crypto.randomUUID(), ownerEmail, amount: redemption.amount, source: "code", sourceKey: codeHash, createdAt: now });
      const [account] = await tx.update(schema.zenyAccounts).set({
        balance: sql`${schema.zenyAccounts.balance} + ${redemption.amount}`,
        updatedAt: now,
      }).where(eq(schema.zenyAccounts.ownerEmail, ownerEmail)).returning({ balance: schema.zenyAccounts.balance });
      return { amount: redemption.amount, balance: account.balance };
    });
  },
});
