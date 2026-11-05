import { createHash, randomBytes } from "node:crypto";
import { fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { and, eq } from "drizzle-orm";

import { getDb, schema } from "./db.js";

export async function ensureTranserCreatorOwner() {
  const configured = process.env.TRANSER_CREATOR_EMAIL?.trim().toLowerCase(); // guard:allow-env-credential — deployment-scoped creator account identifier, not a user credential.
  if (configured) await getDb().insert(schema.transerCreatorOwner).values({ id: "primary", ownerEmail: configured }).onConflictDoNothing();
  const [owner] = await getDb().select({ ownerEmail: schema.transerCreatorOwner.ownerEmail }).from(schema.transerCreatorOwner).where(eq(schema.transerCreatorOwner.id, "primary")).limit(1);
  return owner?.ownerEmail ?? null;
}

export async function requireTranserOwner() {
  const userEmail = getRequestUserEmail()?.trim().toLowerCase();
  if (!userEmail) fail("Inicia sesión para continuar.", { statusCode: 401 });
  const ownerEmail = await ensureTranserCreatorOwner();
  if (!ownerEmail) fail("El creador aún no está configurado.", { statusCode: 503, errorCode: "creator_not_configured" });
  if (userEmail !== ownerEmail) fail("Esta función está reservada al propietario.", { statusCode: 403, errorCode: "creator_owner_only" });
  return userEmail;
}

export async function requireTranserCreator() {
  const userEmail = getRequestUserEmail()?.trim().toLowerCase();
  if (!userEmail) fail("Inicia sesión para continuar.", { statusCode: 401 });
  const ownerEmail = await ensureTranserCreatorOwner();
  if (!ownerEmail) fail("El creador aún no está configurado.", { statusCode: 503, errorCode: "creator_not_configured" });
  if (userEmail === ownerEmail) return userEmail;
  const [admin] = await getDb().select({ userEmail: schema.transerCreatorAdmins.userEmail }).from(schema.transerCreatorAdmins).where(eq(schema.transerCreatorAdmins.userEmail, userEmail)).limit(1);
  if (!admin) fail("Esta función está reservada al creador y sus administradores.", { statusCode: 403, errorCode: "creator_only" });
  return userEmail;
}

export async function getTranserCreatorStatus() {
  const userEmail = getRequestUserEmail()?.trim().toLowerCase();
  const ownerEmail = await ensureTranserCreatorOwner();
  const [admin] = userEmail ? await getDb().select({ userEmail: schema.transerCreatorAdmins.userEmail }).from(schema.transerCreatorAdmins).where(eq(schema.transerCreatorAdmins.userEmail, userEmail)).limit(1) : [];
  const isOwner = Boolean(userEmail && ownerEmail && userEmail === ownerEmail);
  return {
    isCreator: isOwner || Boolean(admin),
    isOwner,
    admins: isOwner ? (await getDb().select({ userEmail: schema.transerCreatorAdmins.userEmail }).from(schema.transerCreatorAdmins)) : [],
  };
}

export function hashZenyCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function makeZenyCode() {
  const value = randomBytes(8).toString("hex").toUpperCase();
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
}
