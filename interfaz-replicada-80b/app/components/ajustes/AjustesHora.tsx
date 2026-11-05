import { useEffect, useState } from "react";
import { ahora, aCampoFecha, formatearFecha, formatearHora, type ModoHora, type Reloj, type FormatoHora } from "@/lib/hora";

type Idioma = "es" | "en";

const TEXTOS = {
  es: {
    formato: "FORMATO",
    modo: "MODO",
    automatica: "AUTOMÁTICA",
    manual: "MANUAL",
    automaticaAyuda: "Usa la hora y fecha del dispositivo.",
    manualAyuda: "Fija la fecha y hora manualmente.",
    aplicar: "APLICAR",
    actual: "Vista previa",
  },
  en: {
    formato: "FORMAT",
    modo: "MODE",
    automatica: "AUTOMATIC",
    manual: "MANUAL",
    automaticaAyuda: "Uses the date and time of the device.",
    manualAyuda: "Set the date and time manually.",
    aplicar: "APPLY",
    actual: "Preview",
  },
} as const;

const boton = (activo: boolean) =>
  `flex-1 rounded-sm border-2 border-[var(--acento)] px-2 py-2 font-bold ${
    activo ? "bg-[var(--principal)] text-white" : "bg-white text-neutral-900"
  }`;

export function AjustesHora({
  idioma,
  reloj,
  onCambiar,
}: {
  idioma: Idioma;
  reloj: Reloj;
  onCambiar: (siguiente: Reloj) => void;
}) {
  const t = TEXTOS[idioma];
  const [, latido] = useState(0);
  const [borrador, setBorrador] = useState(() => aCampoFecha(ahora(reloj)));

  useEffect(() => {
    const id = setInterval(() => latido((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elegirFormato = (formato: FormatoHora) => onCambiar({ ...reloj, formato });

  const elegirModo = (modo: ModoHora) => {
    if (modo === "manual") {
      setBorrador(aCampoFecha(ahora(reloj)));
      onCambiar({ ...reloj, modo });
    } else {
      onCambiar({ ...reloj, modo, desfase: 0 });
    }
  };

  const aplicarManual = () => {
    const ms = new Date(borrador).getTime();
    if (Number.isNaN(ms)) return;
    onCambiar({ ...reloj, desfase: ms - Date.now() });
  };

  const ahoraMs = ahora(reloj);

  return (
    <div className="flex flex-col gap-3 rounded-sm border-4 border-[var(--acento)] bg-white p-3 text-neutral-900">
      <div className="text-center">
        <p className="text-xs font-bold text-neutral-500">{t.actual}</p>
        <p className="text-2xl font-bold tabular-nums text-[var(--principal)]">
          {formatearHora(ahoraMs, reloj, idioma)}
        </p>
        <p className="text-sm">{formatearFecha(ahoraMs, idioma)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold">{t.formato}</p>
        <div className="flex gap-2">
          <button type="button" aria-pressed={reloj.formato === "12"} onClick={() => elegirFormato("12")} className={boton(reloj.formato === "12")}>
            12 h
          </button>
          <button type="button" aria-pressed={reloj.formato === "24"} onClick={() => elegirFormato("24")} className={boton(reloj.formato === "24")}>
            24 h
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold">{t.modo}</p>
        <div className="flex gap-2">
          <button type="button" aria-pressed={reloj.modo === "automatica"} onClick={() => elegirModo("automatica")} className={boton(reloj.modo === "automatica")}>
            {t.automatica}
          </button>
          <button type="button" aria-pressed={reloj.modo === "manual"} onClick={() => elegirModo("manual")} className={boton(reloj.modo === "manual")}>
            {t.manual}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          {reloj.modo === "automatica" ? t.automaticaAyuda : t.manualAyuda}
        </p>
      </div>

      {reloj.modo === "manual" && (
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            className="min-w-0 flex-1 rounded-sm border-2 border-neutral-400 px-2 py-1"
          />
          <button
            type="button"
            onClick={aplicarManual}
            className="rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] px-3 py-1 font-bold"
          >
            {t.aplicar}
          </button>
        </div>
      )}
    </div>
  );
}
