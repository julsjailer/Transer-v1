import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, schema } from "../server/db.js";
import { hashZenyCode, makeZenyCode, requireTranserCreator } from "../server/transer-creator.js";

export default defineAction({
  description: "Generate single-use internal Zeny reward codes for the configured Transer creator.",
  schema: z.object({ amount: z.number().int().min(1).max(10000), count: z.number().int().min(1).max(50) }),
  run: async ({ amount, count }) => {
    const creatorEmail = await requireTranserCreator();
    const db = getDb();
    const codes: string[] = [];
    await db.transaction(async (tx) => {
      for (let index = 0; index < count; index += 1) {
        const code = makeZenyCode();
        const codeHash = hashZenyCode(code);
        const [created] = await tx.insert(schema.zenyRedemptionCodes).values({ codeHash, amount, createdBy: creatorEmail }).onConflictDoNothing().returning({ codeHash: schema.zenyRedemptionCodes.codeHash });
        if (!created) fail("No se pudo generar un código único; inténtalo de nuevo.", { statusCode: 409, errorCode: "code_collision" });
        await tx.insert(schema.zenyCodeAudit).values({ id: crypto.randomUUID(), codeHash, createdBy: creatorEmail, amount });
        codes.push(code);
      }
    });
    return { codes, amount };
  },
});
