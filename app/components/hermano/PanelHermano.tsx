import { useState } from "react";

import type { Amigo } from "@/lib/hermanos";

type Idioma = "es" | "en";

const HABILIDADES = ["HP+65", "CmstYPBar"];

const TEXTOS = {
  es: {
    amigo: "Hermano",
    nv: "NV",
    foto: "Foto de perfil",
    volver: "Volver",
    vacio: "Vacío",
    pendiente: "Pendiente de definir.",
    sinSecreto: "Aún no hay un secreto compartido.",
    paginaPersonal: "Página Personal",
    eliminar: "Elimin. Hermano",
    salir: "Salir",
    mnsj: "MNSJ",
    secr: "SECR",
    datos: "Datos potenc",
    favoritos: "Favorit",
    combo: "M. Combo",
    sinDatos: "SIN DAT",
    habEnl: "Hab Enl",
    confirmar: "¿Estás seguro(a) de querer eliminar esta conexión?",
    si: "Sí",
    no: "No",
  },
  en: {
    amigo: "Brother",
    nv: "LV",
    foto: "Profile photo",
    volver: "Back",
    vacio: "Empty",
    pendiente: "Pending definition.",
    sinSecreto: "No shared secret yet.",
    paginaPersonal: "Personal Page",
    eliminar: "Remove Brother",
    salir: "Exit",
    mnsj: "MSG",
    secr: "SECRET",
    datos: "Power data",
    favoritos: "Favorites",
    combo: "Combo",
    sinDatos: "NO DATA",
    habEnl: "Linked Abil.",
    confirmar: "Are you sure you want to remove this connection?",
    si: "Yes",
    no: "No",
  },
} as const;

export function PanelHermano({
  idioma,
  nombre,
  foto,
  nivel,
  amigos,
  onRemove,
}: {
  idioma: Idioma;
  nombre: string;
  foto: string | null;
  nivel: string;
  amigos: Amigo[];
  onRemove: (username: string) => void;
}) {
  const t = TEXTOS[idioma];
  const [menu, setMenu] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<number | null>(null);
  const [panel, setPanel] = useState<"mnsj" | "secr" | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);

  const amigoPerfil = amigos.find((a) => a.id === perfil);
  const amigoMenu = amigos.find((a) => a.id === menu);
  const izquierda = amigos.slice(0, 3);
  const derecha = amigos.slice(3, 6);

  const abrirPerfil = (id: number) => {
    setMenu(null);
    setPanel(null);
    setPerfil(id);
  };

  const eliminar = (id: number) => {
    const friend = amigos.find((item) => item.id === id);
    setConfirmar(null);
    if (friend?.username) onRemove(friend.username);
  };

  const tarjeta = (amigo: Amigo) => (
    <button
      key={amigo.id}
      type="button"
      onClick={() => setMenu(amigo.id)}
      aria-label={`${t.amigo} ${amigo.id + 1}`}
      className="flex w-full items-center gap-1 rounded-sm border-2 border-[var(--principal)] bg-[var(--principal)] p-1 text-white shadow-md"
    >
      <div className="flex flex-col px-1 leading-none">
        <span className="text-[9px] font-bold tracking-widest">{t.nv}</span>
        <span className="text-lg font-bold">{amigo.nv}</span>
      </div>
      <div
        className={`ml-auto h-12 w-12 flex-none overflow-hidden border-2 border-white bg-gradient-to-br ${amigo.gradiente}`}
      >
        {amigo.avatarData && (
          <img
            src={amigo.avatarData}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </button>
  );

  const contenido = amigoPerfil ? (
    <div className="flex flex-col gap-3 text-white">
      <button
        type="button"
        onClick={() => setPerfil(null)}
        className="self-start rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] px-3 py-1 text-sm font-bold text-neutral-900"
      >
        ‹ {t.volver}
      </button>

      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 gap-2 rounded-sm border-4 border-[var(--marco)] bg-[var(--principal)] p-2">
          <div
            className={`h-16 w-16 flex-none overflow-hidden border-2 border-white bg-gradient-to-br ${amigoPerfil.gradiente}`}
          >
            {amigoPerfil.avatarData && (
              <img
                src={amigoPerfil.avatarData}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <p className="truncate text-sm font-bold">
              {amigoPerfil.displayName ?? `${t.amigo} ${amigoPerfil.id + 1}`}
            </p>
            <div className="flex items-end gap-1">
              <span className="text-xs font-bold">{t.nv}</span>
              <span className="text-xl font-bold">{amigoPerfil.nv}</span>
            </div>
          </div>
        </div>
        <div className="flex w-16 flex-none flex-col gap-1">
          {(["mnsj", "secr"] as const).map((clave) => (
            <button
              key={clave}
              type="button"
              onClick={() => setPanel(panel === clave ? null : clave)}
              aria-pressed={panel === clave}
              className={`flex-1 rounded-sm border-2 border-[var(--acento)] px-1 text-xs font-bold ${
                panel === clave
                  ? "bg-[var(--acento)] text-neutral-900"
                  : "bg-[var(--principal)] text-white"
              }`}
            >
              {clave === "mnsj" ? t.mnsj : t.secr}
            </button>
          ))}
        </div>
      </div>

      {panel !== null && (
        <div className="whitespace-pre-wrap break-words rounded-sm border-4 border-[var(--marco)] bg-white p-3 text-sm text-neutral-900">
          {panel === "mnsj"
            ? amigoPerfil.description || t.pendiente
            : amigoPerfil.secretDescription || t.sinSecreto}
        </div>
      )}

      <div className="rounded-sm border-4 border-[var(--marco)] bg-[var(--principal)] p-2">
        <p className="mb-2 text-xs font-bold tracking-widest">{t.datos}</p>
        <div className="grid grid-cols-[1fr_0.8fr] gap-2">
          <div>
            <p className="mb-1 text-xs font-bold">{t.favoritos}</p>
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }, (_, i) => {
                const favorite = amigoPerfil.favorites?.find(
                  (card) => card.slot === i,
                );
                return (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden bg-neutral-200"
                  >
                    {favorite?.archivo ? (
                      <img
                        src={`/cartas/${favorite.archivo}`}
                        alt={favorite.nombre}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold">{t.combo}</p>
              <p className="bg-neutral-900 px-1 text-center text-sm font-bold text-lime-300">
                {t.sinDatos}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold">{t.habEnl}</p>
              {HABILIDADES.map((h) => (
                <p key={h} className="text-sm font-bold">
                  {h}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="flex w-[38%] flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) =>
          izquierda[i] ? (
            tarjeta(izquierda[i])
          ) : (
            <div
              key={`vacio-izq-${i}`}
              className="flex h-[66px] items-center justify-center rounded-sm border-2 border-dashed border-[var(--botonBorde)] text-[10px] font-bold text-neutral-500"
            >
              {t.vacio}
            </div>
          ),
        )}
      </div>

      <span aria-hidden className="h-2 w-3 flex-none bg-[var(--acento)]" />

      <div className="flex w-28 flex-none flex-col items-center rounded-sm border-4 border-[var(--acento)] bg-[var(--principal)] p-2 text-white shadow-lg">
        <div className="h-16 w-full overflow-hidden border-2 border-white bg-teal-300">
          {foto ? (
            <img
              src={foto}
              alt={t.foto}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <p className="mt-1 w-full truncate text-center text-xs font-bold">
          {nombre}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-[10px] font-bold">{t.nv}</span>
          <span className="text-xl font-bold">{nivel}</span>
        </div>
      </div>

      <span aria-hidden className="h-2 w-3 flex-none bg-[var(--acento)]" />

      <div className="flex w-[38%] flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) =>
          derecha[i] ? (
            tarjeta(derecha[i])
          ) : (
            <div
              key={`vacio-der-${i}`}
              className="flex h-[66px] w-full items-center justify-center self-center rounded-sm border-2 border-dashed border-[var(--botonBorde)] text-[10px] font-bold text-neutral-500"
            >
              {t.vacio}
            </div>
          ),
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {contenido}

      {confirmar !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs border-4 border-white bg-[#eef8f2] p-3 text-center text-neutral-900 shadow-xl">
            <p className="mb-3 text-sm font-bold">{t.confirmar}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => eliminar(confirmar)}
                className="flex-1 rounded-sm border-2 border-[var(--acento)] bg-[var(--principal)] py-1 font-bold text-white"
              >
                {t.si}
              </button>
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                className="flex-1 rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] py-1 font-bold text-neutral-900"
              >
                {t.no}
              </button>
            </div>
          </div>
        </div>
      )}

      {amigoMenu && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setMenu(null)}
        >
          <div
            className="w-full max-w-xs border-4 border-white bg-[#eef8f2] p-2 text-neutral-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => abrirPerfil(amigoMenu.id)}
              className="block w-full px-3 py-2 text-left font-bold hover:bg-red-100"
            >
              ▶ {t.paginaPersonal}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                setConfirmar(amigoMenu.id);
              }}
              className="block w-full px-3 py-2 text-left font-bold hover:bg-red-100"
            >
              {t.eliminar}
            </button>
            <button
              type="button"
              onClick={() => setMenu(null)}
              className="block w-full px-3 py-2 text-left font-bold hover:bg-red-100"
            >
              {t.salir}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
