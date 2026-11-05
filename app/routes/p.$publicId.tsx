import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { CARTA_POR_CLAVE } from "@/lib/cartas";

export function meta() {
  return [{ title: "Perfil público · Transer" }];
}

export default function PublicBCardProfileRoute() {
  const { publicId = "" } = useParams();
  const profile = useQuery({
    queryKey: ["public-bcard-profile", publicId],
    queryFn: async () => {
      const response = await fetch(`/public-profile/${encodeURIComponent(publicId)}`);
      if (!response.ok) throw new Error("Profile unavailable");
      return response.json() as Promise<{ favorites: Array<{ cardKey: string; slot: number; nombre: string; clase: string; serie: string | null; archivo: string | null; efecto: { es: string; en: string } }>; inventorySummary: { cards: number; copies: number } }>;
    },
    retry: false,
    enabled: Boolean(publicId),
  });

  if (profile.isPending) return <main className="public-profile"><p>Cargando perfil…</p></main>;
  if (profile.isError || !profile.data) return <main className="public-profile"><h1>Perfil no disponible</h1><p>Este perfil es privado o ya no existe.</p></main>;

  return <main className="public-profile"><p className="bcard-kicker">TRANSER · BATTLE CARDS</p><h1>PERSONAL</h1><p>{profile.data.inventorySummary.cards} cartas · {profile.data.inventorySummary.copies} copias</p><section className="public-favorite-grid">{Array.from({ length: 6 }, (_, slot) => {
    const favorite = profile.data.favorites.find((card) => card.slot === slot);
    const card = favorite ? CARTA_POR_CLAVE.get(favorite.cardKey) : null;
    return <article key={slot} className="public-favorite-card">{card?.archivo ? <img src={`/cartas/${card.archivo}`} alt={card.nombre} /> : <div className="bcard-art-placeholder">{slot + 1}</div>}<h2>{card?.nombre ?? "—"}</h2>{card && <p>{card.efecto.es}</p>}</article>;
  })}</section></main>;
}
