import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { CARTAS } from "../app/lib/cartas";

export default defineAction({
  description: "Search the Transer Battle Card catalog by name, class, and series; rarity is not defined in this catalog.",
  schema: z.object({
    search: z.string().max(100).optional().describe("Optional card-name search"),
    clase: z.enum(["estandar", "mega", "giga", "lunar", "evento", "bigbang"]).optional().describe("Optional catalog class filter"),
    serie: z.enum(["Pegasus", "Leo", "Dragon"]).optional().describe("Optional series filter"),
  }),
  http: { method: "GET" },
  run: async ({ search, clase, serie }) => {
    const term = search?.trim().toLocaleLowerCase();
    return CARTAS.filter((card) =>
      (!term || card.nombre.toLocaleLowerCase().includes(term)) &&
      (!clase || card.clase === clase) &&
      (!serie || card.serie === serie),
    );
  },
});
