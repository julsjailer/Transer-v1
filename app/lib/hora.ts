export type FormatoHora = "12" | "24";
export type ModoHora = "automatica" | "manual";
export type Reloj = { modo: ModoHora; formato: FormatoHora; desfase: number };

export const RELOJ_INICIAL: Reloj = { modo: "automatica", formato: "24", desfase: 0 };

export const ahora = (reloj: Reloj) => Date.now() + reloj.desfase;

export const aCampoFecha = (ms: number) => {
  const d = new Date(ms);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

export const formatearFecha = (ms: number, idioma: "es" | "en") =>
  new Date(ms).toLocaleDateString(idioma === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short" });

export const formatearHora = (ms: number, reloj: Reloj, idioma: "es" | "en") =>
  new Date(ms).toLocaleTimeString(idioma === "es" ? "es-ES" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: reloj.formato === "12",
  });
