import { and, eq } from "drizzle-orm";
import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { requireBcardOwner } from "../server/bcard.js";

const input = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), name: z.string().trim().min(1).max(32).describe("Folder name, 1–32 characters") }),
  z.object({ operation: z.literal("rename"), folderId: z.string().uuid(), name: z.string().trim().min(1).max(32).describe("New folder name, 1–32 characters") }),
  z.object({ operation: z.literal("delete"), folderId: z.string().uuid().describe("Folder id to delete") }),
]);

export default defineAction({
  description: "Create, rename, or delete one of the signed-in user's private B.Card folders.",
  schema: input,
  run: async (args) => {
    const ownerEmail = requireBcardOwner();
    const db = getDb();
    if (args.operation === "create") {
      const [folder] = await db.insert(schema.bcardFolders).values({
        id: crypto.randomUUID(),
        ownerEmail,
        name: args.name,
      }).returning();
      return folder;
    }
    if (args.operation === "rename") {
      const [folder] = await db.update(schema.bcardFolders)
        .set({ name: args.name, updatedAt: new Date().toISOString() })
        .where(and(eq(schema.bcardFolders.id, args.folderId), eq(schema.bcardFolders.ownerEmail, ownerEmail)))
        .returning();
      if (!folder) fail("No se encontró esa carpeta.", { statusCode: 404, errorCode: "folder_not_found" });
      return folder;
    }
    const [folder] = await db.delete(schema.bcardFolders)
      .where(and(eq(schema.bcardFolders.id, args.folderId), eq(schema.bcardFolders.ownerEmail, ownerEmail)))
      .returning({ id: schema.bcardFolders.id });
    if (!folder) fail("No se encontró esa carpeta.", { statusCode: 404, errorCode: "folder_not_found" });
    return folder;
  },
});
