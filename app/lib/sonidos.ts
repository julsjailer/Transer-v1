export const SONIDO_SLOT = {
  personal: "personal.wav",
  mega: "mega.wav",
  hermano: "brother.wav",
} as const;

export const SONIDO_MENU = {
  cart: "b.card.wav",
  objeto: "item.wav",
  biblio: "library.wav",
  guard: "save.wav",
  aire: "onair.wav",
  conect: "conect.wav",
  correo: "email.wav",
} as const;

export const SONIDO_EVENTO = {
  dempaOn: "dempa-on.wav",
  dempaOff: "dempa-off.wav",
  notification: "notification.wav",
  mailNotification: "mail-notification.wav",
  scroll: "scroll.wav",
  back: "back.wav",
  levelUp: "level-up.wav",
  cardSelect: "card-select.wav",
  cardObtained: "card-obtained.wav",
  purchase: "purchase.wav",
  qrConfirmed: "qr-confirmed.wav",
  denied: "denied.wav",
  error: "error.wav",
} as const;

let contexto: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function obtenerContexto() {
  contexto ??= new AudioContext();
  return contexto;
}

function cargar(archivo: string) {
  let buffer = buffers.get(archivo);
  if (!buffer) {
    buffer = fetch(`/sonidos/${archivo}`)
      .then((r) => r.arrayBuffer())
      .then((datos) => obtenerContexto().decodeAudioData(datos));
    buffers.set(archivo, buffer);
  }
  return buffer;
}

if (typeof window !== "undefined") {
  for (const archivo of [
    ...Object.values(SONIDO_SLOT),
    ...Object.values(SONIDO_MENU),
    ...Object.values(SONIDO_EVENTO),
  ]) {
    cargar(archivo).catch(() => {});
  }
}

let activo = true;
let volumen = 1;

export function establecerSonidoActivo(valor: boolean) {
  activo = valor;
}

export function establecerVolumen(porcentaje: number) {
  volumen = porcentaje / 100;
}

export function reproducirSonido(archivo: string) {
  if (
    !activo ||
    typeof window === "undefined" ||
    typeof window.AudioContext === "undefined"
  )
    return;
  try {
    const ctx = obtenerContexto();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    cargar(archivo)
      .then((buffer) => {
        const fuente = ctx.createBufferSource();
        const ganancia = ctx.createGain();
        ganancia.gain.value = volumen;
        fuente.buffer = buffer;
        fuente.connect(ganancia).connect(ctx.destination);
        fuente.start();
      })
      .catch(() => {});
  } catch {
    return;
  }
}
