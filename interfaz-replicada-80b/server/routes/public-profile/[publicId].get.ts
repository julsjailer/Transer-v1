import { countDistinct, eq, sum } from "drizzle-orm";
import { defineEventHandler, getRouterParam, setResponseHeader, setResponseStatus } from "h3";
import { CARTA_POR_CLAVE } from "../../../app/lib/cartas";
import { getDb, schema } from "../../db.js";

export default defineEventHandler(async (event) => {
  const publicId = getRouterParam(event, "publicId");
  setResponseHeader(event, "Cache-Control", "no-store");
  if (!publicId) {
    setResponseStatus(event, 404);
    return { error: "Profile not found" };
  }
  const [profile] = await getDb().select({ ownerEmail: schema.bcardProfileSettings.ownerEmail, collectionPublic: schema.bcardProfileSettings.collectionPublic })
    .from(schema.bcardProfileSettings)
    .where(eq(schema.bcardProfileSettings.publicId, publicId))
    .limit(1);
  if (!profile || !profile.collectionPublic) {
    setResponseStatus(event, 404);
    return { error: "Profile not found" };
  }
  const [favorites, [inventorySummary]] = await Promise.all([
    getDb().select({ slot: schema.bcardFavorites.slot, cardKey: schema.bcardFavorites.cardKey })
      .from(schema.bcardFavorites)
      .where(eq(schema.bcardFavorites.ownerEmail, profile.ownerEmail)),
    getDb().select({ cards: countDistinct(schema.bcardInventory.cardKey), copies: sum(schema.bcardInventory.quantity) })
      .from(schema.bcardInventory)
      .where(eq(schema.bcardInventory.ownerEmail, profile.ownerEmail)),
  ]);
  return {
    favorites: favorites.sort((a, b) => a.slot - b.slot).flatMap((favorite) => {
      const card = CARTA_POR_CLAVE.get(favorite.cardKey);
      return card ? [{ ...card, cardKey: favorite.cardKey, slot: favorite.slot }] : [];
    }),
    inventorySummary: { cards: Number(inventorySummary?.cards ?? 0), copies: Number(inventorySummary?.copies ?? 0) },
  };
});
