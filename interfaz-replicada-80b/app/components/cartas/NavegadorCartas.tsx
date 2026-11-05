import { useMemo, useState, type TouchEvent } from "react";
import IconChevronLeft from "@tabler/icons-react/dist/esm/icons/IconChevronLeft.mjs";
import IconChevronRight from "@tabler/icons-react/dist/esm/icons/IconChevronRight.mjs";
import {
  CARTAS,
  CLASES,
  ELEMENTOS,
  ORDEN_CLASES,
  PROPIEDADES,
  type Carta,
  type Elemento,
  type Idioma,
  type Propiedad,
} from "@/lib/cartas";

const TEXTOS = {
  es: {
    buscar: "Buscar por nombre",
    elemento: "Elemento",
    propiedad: "Propiedad",
    todos: "Todos",
    todas: "Todas",
    propiedades: "Propiedades",
    efecto: "Efecto",
    ap: "AP",
    sinResultados: "No hay cartas con estos filtros.",
    sinMiniatura: "Sin miniatura",
    anterior: "Categoría anterior",
    siguiente: "Categoría siguiente",
    sinValor: "—",
    ninguna: "Ninguna",
  },
  en: {
    buscar: "Search by name",
    elemento: "Element",
    propiedad: "Property",
    todos: "All",
    todas: "All",
    propiedades: "Properties",
    efecto: "Effect",
    ap: "AP",
    sinResultados: "No cards match these filters.",
    sinMiniatura: "No image",
    anterior: "Previous category",
    siguiente: "Next category",
    sinValor: "—",
    ninguna: "None",
  },
} as const;

const claveCarta = (carta: Carta) => `${carta.clase}-${carta.serie ?? ""}-${carta.nombre}`;

function Miniatura({
  archivo,
  nombre,
  textoAlterno,
}: {
  archivo: string | null;
  nombre: string;
  textoAlterno: string;
}) {
  const [fallo, setFallo] = useState(false);

  if (!archivo || fallo) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-sm border-4 border-[var(--marco)] bg-neutral-200 p-1 text-center text-[10px] text-neutral-600">
        {textoAlterno}
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-sm border-4 border-[var(--marco)] bg-neutral-200">
      <img
        src={`/cartas/${archivo}`}
        alt={nombre}
        loading="lazy"
        onError={() => setFallo(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export function NavegadorCartas({ idioma }: { idioma: Idioma }) {
  const t = TEXTOS[idioma];
  const [indiceClase, setIndiceClase] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [elemento, setElemento] = useState<Elemento | "todos">("todos");
  const [propiedad, setPropiedad] = useState<Propiedad | "todas">("todas");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [inicioToque, setInicioToque] = useState<{ x: number; y: number } | null>(null);

  const clase = ORDEN_CLASES[indiceClase];

  const cartas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return CARTAS.filter(
      (carta) =>
        carta.clase === clase &&
        (termino === "" || carta.nombre.toLowerCase().includes(termino)) &&
        (elemento === "todos" || carta.elemento === elemento) &&
        (propiedad === "todas" || carta.propiedades.includes(propiedad)),
    );
  }, [clase, busqueda, elemento, propiedad]);

  const actual = cartas.find((carta) => claveCarta(carta) === seleccion) ?? cartas[0] ?? null;

  const cambiarClase = (paso: number) =>
    setIndiceClase((i) => Math.min(ORDEN_CLASES.length - 1, Math.max(0, i + paso)));

  const alTocarInicio = (evento: TouchEvent) => {
    const toque = evento.touches[0];
    setInicioToque({ x: toque.clientX, y: toque.clientY });
  };

  const alTerminarToque = (evento: TouchEvent) => {
    if (!inicioToque) return;
    const toque = evento.changedTouches[0];
    const dx = toque.clientX - inicioToque.x;
    const dy = toque.clientY - inicioToque.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) cambiarClase(dx < 0 ? 1 : -1);
    setInicioToque(null);
  };

  return (
    <div className="bcard-browser mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-2" onTouchStart={alTocarInicio} onTouchEnd={alTerminarToque}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t.anterior}
          disabled={indiceClase === 0}
          onClick={() => cambiarClase(-1)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-neutral-900 disabled:opacity-40 sm:h-9 sm:w-9"
        >
          <IconChevronLeft size={20} stroke={2} />
        </button>
        <p className="flex-1 text-center font-bold text-[var(--principal)]">
          {CLASES[clase][idioma]}
          <span className="ml-2 text-xs font-normal text-neutral-500">{cartas.length}</span>
        </p>
        <button
          type="button"
          aria-label={t.siguiente}
          disabled={indiceClase === ORDEN_CLASES.length - 1}
          onClick={() => cambiarClase(1)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-neutral-900 disabled:opacity-40 sm:h-9 sm:w-9"
        >
          <IconChevronRight size={20} stroke={2} />
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
        <div className="flex min-w-0 flex-col gap-1.5 rounded-sm border-2 border-[var(--acento)] bg-white p-1.5 sm:border-4 sm:p-2">
          {actual ? (
            <>
              <Miniatura
                key={claveCarta(actual)}
                archivo={actual.archivo}
                nombre={actual.nombre}
                textoAlterno={t.sinMiniatura}
              />
              <p className="truncate text-xs font-bold">{actual.nombre}</p>
              <p className="text-xs">
                {t.ap}: {actual.ap ?? t.sinValor}
              </p>
              <p className="text-xs">
                {t.elemento}: {ELEMENTOS[actual.elemento][idioma]}
              </p>
              <p className="text-xs">
                {t.propiedades}:{" "}
                {actual.propiedades.length
                  ? actual.propiedades.map((p) => PROPIEDADES[p][idioma]).join(", ")
                  : t.ninguna}
              </p>
              <p className="rounded-sm bg-neutral-50 p-1 text-[10px] leading-snug">
                <span className="font-bold">{t.efecto}: </span>
                {actual.efecto[idioma]}
              </p>
            </>
          ) : (
            <p className="self-center py-6 text-center text-xs">{t.sinResultados}</p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t.buscar}
            aria-label={t.buscar}
            className="rounded-sm border-2 border-neutral-400 bg-white px-2 py-1 text-sm"
          />
          <select
            aria-label={t.elemento}
            value={elemento}
            onChange={(e) => setElemento(e.target.value as Elemento | "todos")}
            className="rounded-sm border-2 border-neutral-400 bg-white px-2 py-1 text-sm"
          >
            <option value="todos">
              {t.elemento}: {t.todos}
            </option>
            {(Object.keys(ELEMENTOS) as Elemento[]).map((id) => (
              <option key={id} value={id}>
                {ELEMENTOS[id][idioma]}
              </option>
            ))}
          </select>
          <select
            aria-label={t.propiedad}
            value={propiedad}
            onChange={(e) => setPropiedad(e.target.value as Propiedad | "todas")}
            className="rounded-sm border-2 border-neutral-400 bg-white px-2 py-1 text-sm"
          >
            <option value="todas">
              {t.propiedad}: {t.todas}
            </option>
            {(Object.keys(PROPIEDADES) as Propiedad[]).map((id) => (
              <option key={id} value={id}>
                {PROPIEDADES[id][idioma]}
              </option>
            ))}
          </select>
          <ul className="h-48 max-h-[42dvh] space-y-1 overflow-y-auto rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] p-1 sm:h-56 sm:max-h-[50dvh] lg:h-64">
            {cartas.map((carta) => {
              const clave = claveCarta(carta);
              const activa = actual !== null && claveCarta(actual) === clave;
              return (
                <li key={clave}>
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setSeleccion(clave)}
                    className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-sm border-2 px-2 py-1 text-left text-xs sm:min-h-8 ${
                      activa
                        ? "border-[var(--principal)] bg-white font-bold"
                        : "border-[var(--acento)] bg-[var(--tile)]"
                    }`}
                  >
                    <span className="truncate">{carta.nombre}</span>
                    <span className="flex-none text-[10px] text-neutral-600">
                      {carta.id ?? ""}
                      {carta.serie ? ` ${carta.serie}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
