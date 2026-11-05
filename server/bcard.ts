import { fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { randomInt } from "node:crypto";

import { CARTAS, CARTA_POR_CLAVE, claveDeCarta, type Carta } from "../app/lib/cartas";

export function requireBcardOwner() {
  const ownerEmail = getRequestUserEmail();
  if (!ownerEmail) fail("Inicia sesión para acceder a tu colección.", { statusCode: 401 });
  return ownerEmail;
}

export function requireBcardCard(cardKey: string): Carta {
  const card = CARTA_POR_CLAVE.get(cardKey);
  if (!card) fail("La carta no existe en el catálogo.", { statusCode: 404, errorCode: "card_not_found" });
  return card;
}

export function drawBcardKeys(quantity: number) {
  return Array.from({ length: quantity }, () => claveDeCarta(CARTAS[randomInt(CARTAS.length)]));
}
