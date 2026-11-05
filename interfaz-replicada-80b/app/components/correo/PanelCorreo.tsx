import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Amigo } from "@/lib/hermanos";
import { ahora, formatearFecha, formatearHora, type Reloj } from "@/lib/hora";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import IconAlertTriangle from "@tabler/icons-react/dist/esm/icons/IconAlertTriangle.mjs";
import IconArrowBackUp from "@tabler/icons-react/dist/esm/icons/IconArrowBackUp.mjs";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconArrowsExchange from "@tabler/icons-react/dist/esm/icons/IconArrowsExchange.mjs";
import IconCheck from "@tabler/icons-react/dist/esm/icons/IconCheck.mjs";
import IconGift from "@tabler/icons-react/dist/esm/icons/IconGift.mjs";
import IconMail from "@tabler/icons-react/dist/esm/icons/IconMail.mjs";
import IconStar from "@tabler/icons-react/dist/esm/icons/IconStar.mjs";
import IconStarFilled from "@tabler/icons-react/dist/esm/icons/IconStarFilled.mjs";
import IconSwords from "@tabler/icons-react/dist/esm/icons/IconSwords.mjs";
import IconTrash from "@tabler/icons-react/dist/esm/icons/IconTrash.mjs";
import IconUser from "@tabler/icons-react/dist/esm/icons/IconUser.mjs";

type Idioma = "es" | "en";
type Icono = "mensaje" | "advertencia" | "reto" | "intercambio";
type Seccion = "entrada" | "amigos" | "borradores" | "salida" | "eliminados";
type Caja = "entrada" | "salida" | "eliminados";
type Filtro = "todos" | "noLeidos" | "importantes";
type Orden = "recientes" | "antiguos" | "importantes";
type Accion = "enviar" | "guardar" | "reescribir" | "descartar" | "eliminar" | "eliminarSeleccion" | "leer";
type Aviso = "enviado" | "guardado" | "eliminado" | "leido" | null;
type Mensaje = {
  id: number;
  de: string | null;
  para: string | null;
  asunto: string;
  cuerpo: string;
  icono: Icono;
  leido: boolean;
  importante: boolean;
  fecha: number;
  mailId?: string;
  attachments?: { type: string; key: string | null; quantity: number; imageData: string | null; card: { nombre: string } | null }[];
};
type Borrador = {
  id: number | null;
  destinatario: number | null;
  icono: Icono;
  asunto: string;
  cuerpo: string;
};

const SECCIONES: Seccion[] = ["entrada", "amigos", "borradores", "salida", "eliminados"];

const HORA = 60 * 60 * 1000;
const CORREOS_INICIALES: Mensaje[] = [
  {
    id: 1,
    de: "Sistema",
    para: null,
    asunto: "Bienvenido al Transador",
    cuerpo: "Bienvenido al Transador.\n\nAquí llegarán tus avisos y correos.",
    icono: "mensaje",
    leido: false,
    importante: true,
    fecha: Date.now() - HORA,
  },
  {
    id: 2,
    de: "Yuna",
    para: null,
    asunto: "¿Nos vemos mañana?",
    cuerpo: "Hola,\n\n¿Nos vemos mañana después de clases?\n\nYuna",
    icono: "mensaje",
    leido: true,
    importante: false,
    fecha: Date.now() - 24 * HORA,
  },
];

const CHATS: { id: number; nombre: string; ultimo: Record<Idioma, string>; leido: boolean }[] = [
  { id: 1, nombre: "Yuna", ultimo: { es: "¿Nos vemos mañana?", en: "See you tomorrow?" }, leido: false },
  { id: 2, nombre: "Hermano 1", ultimo: { es: "Sin mensajes nuevos.", en: "No new messages." }, leido: true },
];

const ICONOS = {
  mensaje: IconMail,
  advertencia: IconAlertTriangle,
  reto: IconSwords,
  intercambio: IconArrowsExchange,
} as const;

const BORRADOR_VACIO: Borrador = {
  id: null,
  destinatario: null,
  icono: "mensaje",
  asunto: "",
  cuerpo: "",
};

const TEXTOS = {
  es: {
    secciones: {
      entrada: "ENTRADA",
      amigos: "AMIGOS",
      borradores: "BORRADORES",
      salida: "SALIDA",
      eliminados: "ELIMINADOS",
    },
    redactar: "REDACTAR",
    correo: "CORREO",
    de: "DE",
    yo: "Yo",
    icono: "ICONO",
    regalo: "REGAL",
    asunto: "ASUNTO",
    sinAsunto: "(Sin asunto)",
    cuerpo: "CUERPO",
    guardar: "GUARDAR",
    reescribir: "REESCRIBIR",
    enviar: "ENVIAR",
    eliminar: "ELIMINAR",
    responder: "Responder",
    re: "Re: ",
    importante: "Importante",
    seleccionar: "SELECCIONAR",
    seleccionados: "seleccionados",
    todos: "TODOS",
    marcarLeidos: "LEÍDO",
    filtrar: "Filtrar",
    ordenar: "Ordenar",
    filtros: { todos: "Todos", noLeidos: "No leídos", importantes: "Importantes" },
    ordenes: { recientes: "Recientes", antiguos: "Más antiguos", importantes: "Importantes primero" },
    volver: "Volver",
    cancelar: "CANCELAR",
    confirmar: "CONFIRMAR",
    vacia: "Sin correos.",
    sinBorradores: "Sin borradores.",
    avisoEnviado: "Correo enviado.",
    avisoGuardado: "Borrador guardado.",
    avisoEliminado: "Correo movido a eliminados.",
    avisoLeido: "Correos marcados como leídos.",
    hermano: "Hermano",
    para: "Para",
    sinDestinatario: "Sin destinatario",
    elegirDestinatario: "ELEGIR DESTINATARIO",
    sinHermanos: "No hay hermanos en la banda.",
    tipos: {
      mensaje: "Mensaje normal",
      advertencia: "Advertencia",
      reto: "Reto",
      intercambio: "Intercambio",
    },
    preguntas: {
      enviar: "¿Estás seguro(a) de enviar este correo?",
      guardar: "¿Estás seguro(a) de guardar este borrador?",
      reescribir: "¿Estás seguro(a) de borrar asunto y cuerpo para reescribir?",
      descartar: "¿Estás seguro(a) de descartar este correo sin guardar?",
      eliminar: "¿Estás seguro(a) de eliminar este correo?",
      eliminarSeleccion: "¿Estás seguro(a) de eliminar los correos seleccionados?",
      leer: "¿Estás seguro(a) de marcar los correos seleccionados como leídos?",
    },
  },
  en: {
    secciones: {
      entrada: "INBOX",
      amigos: "FRIENDS",
      borradores: "DRAFTS",
      salida: "OUTBOX",
      eliminados: "DELETED",
    },
    redactar: "COMPOSE",
    correo: "MAIL",
    de: "FROM",
    yo: "Me",
    icono: "ICON",
    regalo: "GIFT",
    asunto: "SUBJECT",
    sinAsunto: "(No subject)",
    cuerpo: "BODY",
    guardar: "SAVE",
    reescribir: "REWRITE",
    enviar: "SEND",
    eliminar: "DELETE",
    responder: "Reply",
    re: "Re: ",
    importante: "Important",
    seleccionar: "SELECT",
    seleccionados: "selected",
    todos: "ALL",
    marcarLeidos: "READ",
    filtrar: "Filter",
    ordenar: "Sort",
    filtros: { todos: "All", noLeidos: "Unread", importantes: "Important" },
    ordenes: { recientes: "Newest", antiguos: "Oldest", importantes: "Important first" },
    volver: "Back",
    cancelar: "CANCEL",
    confirmar: "CONFIRM",
    vacia: "No mail.",
    sinBorradores: "No drafts.",
    avisoEnviado: "Mail sent.",
    avisoGuardado: "Draft saved.",
    avisoEliminado: "Mail moved to deleted.",
    avisoLeido: "Mails marked as read.",
    hermano: "Brother",
    para: "To",
    sinDestinatario: "No recipient",
    elegirDestinatario: "CHOOSE RECIPIENT",
    sinHermanos: "No brothers in the band.",
    tipos: {
      mensaje: "Normal message",
      advertencia: "Warning",
      reto: "Challenge",
      intercambio: "Trade",
    },
    preguntas: {
      enviar: "Are you sure you want to send this mail?",
      guardar: "Are you sure you want to save this draft?",
      reescribir: "Are you sure you want to clear subject and body to rewrite?",
      descartar: "Are you sure you want to discard this mail without saving?",
      eliminar: "Are you sure you want to delete this mail?",
      eliminarSeleccion: "Are you sure you want to delete the selected mails?",
      leer: "Are you sure you want to mark the selected mails as read?",
    },
  },
} as const;

const coincide = (m: Mensaje, filtro: Filtro) =>
  filtro === "todos" || (filtro === "noLeidos" ? !m.leido : m.importante);

const comparar = (orden: Orden) => (a: Mensaje, b: Mensaje) => {
  if (orden === "antiguos") return a.fecha - b.fecha;
  if (orden === "importantes") return Number(b.importante) - Number(a.importante) || b.fecha - a.fecha;
  return b.fecha - a.fecha;
};

export function PanelCorreo({
  idioma,
  amigos,
  reloj,
}: {
  idioma: Idioma;
  amigos: Amigo[];
  reloj: Reloj;
}) {
  const t = TEXTOS[idioma];
  const carril = useRef<HTMLDivElement>(null);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const [pestana, setPestana] = useState(0);
  const [entrada, setEntrada] = useState<Mensaje[]>(CORREOS_INICIALES);
  const [salida, setSalida] = useState<Mensaje[]>([]);
  const [eliminados, setEliminados] = useState<Mensaje[]>([]);
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [abierto, setAbierto] = useState<{ caja: Caja; id: number } | null>(null);
  const [redactando, setRedactando] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [giftMode, setGiftMode] = useState(false);
  const [giftUsername, setGiftUsername] = useState("");
  const [giftCardKey, setGiftCardKey] = useState("");
  const [giftCardQuantity, setGiftCardQuantity] = useState(1);
  const [giftHourglasses, setGiftHourglasses] = useState(0);
  const [giftImageData, setGiftImageData] = useState<string | null>(null);
  const [giftError, setGiftError] = useState("");
  const mailQuery = useActionQuery("get-transer-mail", {});
  const inventoryQuery = useActionQuery("get-bcard-dashboard", {});
  const sendGift = useActionMutation("send-transer-gift");
  const markRead = useActionMutation("mark-transer-mail-read");
  const destino = amigos.find((a) => a.id === borrador.destinatario);
  const nombreDe = (amigo: Amigo) => `${t.hermano} ${amigo.id + 1}`;
  const seccionActual = SECCIONES[pestana];
  const cajaActual: Caja | null =
    seccionActual === "entrada" || seccionActual === "salida" || seccionActual === "eliminados"
      ? seccionActual
      : null;

  useEffect(() => {
    if (!mailQuery.data) return;
    const toMessage = (message: (typeof mailQuery.data.inbox)[number], sent: boolean): Mensaje => ({
      id: Number.parseInt(message.id.replace(/-/g, "").slice(0, 10), 16),
      mailId: message.id,
      de: sent ? null : message.from,
      para: sent ? message.to : null,
      asunto: message.subject,
      cuerpo: message.body,
      icono: "mensaje",
      leido: sent || message.read,
      importante: false,
      fecha: new Date(message.createdAt).getTime(),
      attachments: message.attachments,
    });
    setEntrada([...mailQuery.data.inbox.map((message) => toMessage(message, false)), ...CORREOS_INICIALES]);
    setSalida(mailQuery.data.outbox.map((message) => toMessage(message, true)));
  }, [mailQuery.data]);

  useEffect(() => {
    botones.current[pestana]?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    setSeleccionando(false);
    setSeleccion([]);
  }, [pestana]);

  const irA = (indice: number) => {
    setPestana(indice);
    carril.current?.scrollTo({ left: indice * carril.current.clientWidth, behavior: "smooth" });
  };

  const alDesplazar = () => {
    const el = carril.current;
    if (!el) return;
    setPestana(Math.round(el.scrollLeft / el.clientWidth));
  };

  const listaDe = (caja: Caja) => (caja === "entrada" ? entrada : caja === "salida" ? salida : eliminados);

  const cambiarMensaje = (id: number, cambio: (m: Mensaje) => Mensaje) => {
    const aplicar = (lista: Mensaje[]) => lista.map((m) => (m.id === id ? cambio(m) : m));
    setEntrada(aplicar);
    setSalida(aplicar);
    setEliminados(aplicar);
  };

  const abrirCorreo = (caja: Caja, id: number) => {
    const message = listaDe(caja).find((item) => item.id === id);
    setAbierto({ caja, id });
    cambiarMensaje(id, (m) => ({ ...m, leido: true }));
    if (caja === "entrada" && message?.mailId) markRead.mutate({ messageId: message.mailId });
  };

  const alternarSeleccion = (id: number) =>
    setSeleccion((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));

  const salirDeSeleccion = () => {
    setSeleccionando(false);
    setSeleccion([]);
  };

  const abrirRedaccion = () => {
    setAviso(null);
    setBorrador(BORRADOR_VACIO);
    setRedactando(true);
  };

  const abrirBorrador = (b: Borrador) => {
    setAviso(null);
    setBorrador(b);
    setRedactando(true);
  };

  const responder = (m: Mensaje) => {
    setAbierto(null);
    setAviso(null);
    setBorrador({ ...BORRADOR_VACIO, asunto: `${t.re}${m.asunto}` });
    setRedactando(true);
  };

  const cerrarRedaccion = () => {
    setBorrador(BORRADOR_VACIO);
    setRedactando(false);
  };

  const confirmarAccion = () => {
    switch (accion) {
      case "enviar": {
        if (giftMode) {
          const attachments = [
            ...(giftCardKey ? [{ type: "card" as const, key: giftCardKey, quantity: giftCardQuantity }] : []),
            ...(giftHourglasses > 0 ? [{ type: "item" as const, key: "hourglass" as const, quantity: giftHourglasses }] : []),
            ...(giftImageData ? [{ type: "image" as const, data: giftImageData }] : []),
          ];
          sendGift.mutate({ toUsername: giftUsername, subject: borrador.asunto, body: borrador.cuerpo, attachments }, {
            onSuccess: () => {
              setGiftError(""); setGiftMode(false); setGiftUsername(""); setGiftCardKey(""); setGiftCardQuantity(1); setGiftHourglasses(0); setGiftImageData(null); cerrarRedaccion(); setAviso("enviado");
            },
            onError: (error) => setGiftError(actionErrorMessage(error) ?? t.avisoEnviado),
          });
          break;
        }
        const mensaje: Mensaje = {
          id: Date.now(),
          de: null,
          para: destino ? nombreDe(destino) : null,
          asunto: borrador.asunto,
          cuerpo: borrador.cuerpo,
          icono: borrador.icono,
          leido: true,
          importante: false,
          fecha: ahora(reloj),
        };
        setSalida((lista) => [mensaje, ...lista]);
        if (borrador.id !== null) {
          const id = borrador.id;
          setBorradores((lista) => lista.filter((b) => b.id !== id));
        }
        cerrarRedaccion();
        setAviso("enviado");
        break;
      }
      case "guardar": {
        const id = borrador.id ?? Date.now();
        const guardado = { ...borrador, id };
        setBorradores((lista) =>
          lista.some((b) => b.id === id)
            ? lista.map((b) => (b.id === id ? guardado : b))
            : [guardado, ...lista],
        );
        cerrarRedaccion();
        setAviso("guardado");
        break;
      }
      case "descartar":
        cerrarRedaccion();
        break;
      case "reescribir":
        setBorrador((b) => ({ ...b, asunto: "", cuerpo: "" }));
        break;
      case "eliminar":
        if (abierto) {
          const { caja, id } = abierto;
          const mensaje = listaDe(caja).find((m) => m.id === id);
          if (caja === "entrada") setEntrada((lista) => lista.filter((m) => m.id !== id));
          if (caja === "salida") setSalida((lista) => lista.filter((m) => m.id !== id));
          if (mensaje) setEliminados((lista) => [mensaje, ...lista]);
          setAbierto(null);
          setAviso("eliminado");
        }
        break;
      case "eliminarSeleccion": {
        const movidos = [...entrada, ...salida].filter((m) => seleccion.includes(m.id));
        setEntrada((lista) => lista.filter((m) => !seleccion.includes(m.id)));
        setSalida((lista) => lista.filter((m) => !seleccion.includes(m.id)));
        setEliminados((lista) => [...movidos, ...lista]);
        salirDeSeleccion();
        setAviso("eliminado");
        break;
      }
      case "leer": {
        const marcar = (lista: Mensaje[]) =>
          lista.map((m) => (seleccion.includes(m.id) ? { ...m, leido: true } : m));
        setEntrada(marcar);
        setSalida(marcar);
        setEliminados(marcar);
        salirDeSeleccion();
        setAviso("leido");
        break;
      }
    }
    setAccion(null);
  };

  const mensajeAbierto = abierto ? listaDe(abierto.caja).find((m) => m.id === abierto.id) : undefined;
  const mostrados = (caja: Caja) =>
    [...listaDe(caja)].filter((m) => coincide(m, filtro)).sort(comparar(orden));


  const filaCorreo = (m: Mensaje, caja: Caja) => {
    const Icono = ICONOS[m.icono];
    const marcado = seleccion.includes(m.id);
    const principal = caja === "salida" ? `${t.para}: ${m.para ?? t.yo}` : (m.de ?? t.yo);
    const contenido = (
      <>
        {seleccionando && (
          <span
            className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] ${
              marcado ? "bg-[var(--principal)] text-white" : "bg-white"
            }`}
          >
            {marcado && <IconCheck size={14} stroke={3} />}
          </span>
        )}
        <Icono size={18} stroke={2} className="mt-0.5 flex-none" />
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1 ${m.leido ? "" : "font-bold"}`}>
            <span className="truncate">{principal}</span>
            {m.importante && <IconStarFilled size={12} className="flex-none text-[var(--principal)]" />}
          </span>
          <span className="block truncate text-neutral-600">{m.asunto || t.sinAsunto}</span>
        </span>
        <span className="flex flex-none flex-col items-end text-xs leading-tight text-neutral-500">
          <span>{formatearFecha(m.fecha, idioma)}</span>
          <span className="tabular-nums">{formatearHora(m.fecha, reloj, idioma)}</span>
        </span>
      </>
    );
    return (
      <li key={m.id}>
        <button
          type="button"
          onClick={() => (seleccionando ? alternarSeleccion(m.id) : abrirCorreo(caja, m.id))}
          className={`flex w-full items-start gap-2 rounded-sm border-2 px-3 py-2 text-left ${
            marcado ? "border-[var(--principal)] bg-[var(--tile)]" : "border-[var(--marco)]"
          }`}
        >
          {contenido}
        </button>
      </li>
    );
  };

  const panel = (contenido: ReactNode) => (
    <div className="w-full flex-none snap-start snap-always overflow-y-auto p-3">
      <ul className="space-y-2">{contenido}</ul>
    </div>
  );

  const listaCorreos = (caja: Caja) => {
    const filas = mostrados(caja);
    return filas.length === 0
      ? <li className="text-neutral-500">{t.vacia}</li>
      : filas.map((m) => filaCorreo(m, caja));
  };

  const barraCorreos = cajaActual && (
    <div className="flex flex-none flex-wrap items-center gap-2 border-b-2 border-neutral-300 p-2 text-sm">
      {seleccionando ? (
        <>
          <span className="font-bold">
            {seleccion.length} {t.seleccionados}
          </span>
          <button
            type="button"
            onClick={() => setSeleccion(mostrados(cajaActual).map((m) => m.id))}
            className="rounded-sm border-2 border-[var(--acento)] bg-white px-2 py-1 font-bold"
          >
            {t.todos}
          </button>
          <button
            type="button"
            disabled={seleccion.length === 0}
            onClick={() => setAccion("leer")}
            className="rounded-sm border-2 border-[var(--acento)] bg-white px-2 py-1 font-bold disabled:opacity-40"
          >
            {t.marcarLeidos}
          </button>
          {cajaActual !== "eliminados" && (
            <button
              type="button"
              disabled={seleccion.length === 0}
              onClick={() => setAccion("eliminarSeleccion")}
              className="rounded-sm border-2 border-[var(--acento)] bg-white px-2 py-1 font-bold disabled:opacity-40"
            >
              {t.eliminar}
            </button>
          )}
          <button
            type="button"
            onClick={salirDeSeleccion}
            className="ml-auto rounded-sm border-2 border-neutral-400 px-2 py-1 font-bold"
          >
            {t.cancelar}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSeleccionando(true)}
            className="rounded-sm border-2 border-[var(--acento)] bg-white px-2 py-1 font-bold"
          >
            {t.seleccionar}
          </button>
          <select
            aria-label={t.filtrar}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
            className="rounded-sm border-2 border-neutral-400 bg-white px-1 py-1"
          >
            {(Object.keys(t.filtros) as Filtro[]).map((f) => (
              <option key={f} value={f}>
                {t.filtros[f]}
              </option>
            ))}
          </select>
          <select
            aria-label={t.ordenar}
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-sm border-2 border-neutral-400 bg-white px-1 py-1"
          >
            {(Object.keys(t.ordenes) as Orden[]).map((o) => (
              <option key={o} value={o}>
                {t.ordenes[o]}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );

  const selector = eligiendo && (
    <div className="absolute inset-0 z-10 flex flex-col gap-2 bg-white p-3">
      <p className="font-bold tracking-wider text-[var(--principal)]">{t.elegirDestinatario}</p>
      {amigos.length === 0 && <p className="text-neutral-500">{t.sinHermanos}</p>}
      <ul className="space-y-2 overflow-y-auto">
        {amigos.map((amigo) => (
          <li key={amigo.id}>
            <button
              type="button"
              onClick={() => {
                setBorrador({ ...borrador, destinatario: amigo.id });
                setEligiendo(false);
              }}
              className="flex w-full items-center gap-3 rounded-sm border-2 border-[var(--acento)] px-3 py-2 text-left font-bold"
            >
              <span className={`h-10 w-10 flex-none border-2 border-white bg-gradient-to-br ${amigo.gradiente}`} />
              {nombreDe(amigo)}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setEligiendo(false)}
        className="mt-auto rounded-sm border-2 border-neutral-400 px-2 py-2 font-bold"
      >
        {t.cancelar}
      </button>
    </div>
  );

  const dialogo = accion && (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs space-y-3 rounded-sm border-4 border-[var(--acento)] bg-white p-4 text-center font-bold text-neutral-900">
        <p>{t.preguntas[accion]}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccion(null)}
            className="rounded-sm border-2 border-neutral-400 px-2 py-1"
          >
            {t.cancelar}
          </button>
          <button
            type="button"
            onClick={confirmarAccion}
            className="rounded-sm border-2 border-[var(--acento)] bg-[var(--principal)] px-2 py-1 text-white"
          >
            {t.confirmar}
          </button>
        </div>
      </div>
    </div>
  );

  const DetalleIcono = mensajeAbierto ? ICONOS[mensajeAbierto.icono] : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative flex-none border-b-2 border-neutral-300">
        <div role="tablist" className="flex gap-2 overflow-x-auto p-2 pr-36">
          {SECCIONES.map((s, i) => (
            <button
              key={s}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={pestana === i}
              onClick={() => irA(i)}
              className={`scroll-mr-40 flex-none whitespace-nowrap rounded-sm border-2 border-[var(--acento)] px-3 py-1 font-bold ${
                pestana === i ? "bg-[var(--principal)] text-white" : "bg-white text-neutral-900"
              }`}
            >
              {t.secciones[s]}
            </button>
          ))}
        </div>
        <div className="absolute inset-y-0 right-0 z-10 flex items-center border-l-2 border-neutral-300 bg-white px-2">
          <button
            type="button"
            onClick={abrirRedaccion}
            className="rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] px-2 py-1 font-bold text-neutral-900"
          >
            {t.redactar}
          </button>
        </div>
      </div>

      {barraCorreos}

      {aviso && (
        <p className="px-3 pt-2 text-xs font-bold text-[var(--principal)]">
          {aviso === "enviado"
            ? t.avisoEnviado
            : aviso === "guardado"
              ? t.avisoGuardado
              : aviso === "leido"
                ? t.avisoLeido
                : t.avisoEliminado}
        </p>
      )}

      <div
        ref={carril}
        onScroll={alDesplazar}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {panel(listaCorreos("entrada"))}
        {panel(
          CHATS.map((chat) => (
            <li key={chat.id}>
              <button type="button" className="w-full rounded-sm border-2 border-[var(--acento)] px-3 py-2 text-left">
                <span className={chat.leido ? "" : "font-bold"}>
                  {chat.leido ? "" : "● "}
                  {chat.nombre}
                </span>
                <span className="block text-neutral-600">{chat.ultimo[idioma]}</span>
              </button>
            </li>
          )),
        )}
        {panel(
          borradores.length === 0 ? (
            <li className="text-neutral-500">{t.sinBorradores}</li>
          ) : (
            borradores.map((b) => {
              const amigo = amigos.find((a) => a.id === b.destinatario);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => abrirBorrador(b)}
                    className="w-full rounded-sm border-2 border-[var(--marco)] px-3 py-2 text-left"
                  >
                    <span className="block truncate font-bold">{b.asunto || t.sinAsunto}</span>
                    <span className="block truncate text-neutral-600">
                      {amigo ? nombreDe(amigo) : t.sinDestinatario}
                    </span>
                  </button>
                </li>
              );
            })
          ),
        )}
        {panel(listaCorreos("salida"))}
        {panel(listaCorreos("eliminados"))}
      </div>

      {mensajeAbierto && DetalleIcono && abierto && (
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-white">
          <div className="flex flex-none items-center gap-2 border-b-2 border-neutral-300 p-2">
            <button
              type="button"
              aria-label={t.volver}
              onClick={() => setAbierto(null)}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-neutral-900"
            >
              <IconArrowLeft size={18} stroke={2} />
            </button>
            <p className="font-bold tracking-wider text-[var(--principal)]">{t.correo}</p>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label={t.importante}
                aria-pressed={mensajeAbierto.importante}
                onClick={() => cambiarMensaje(mensajeAbierto.id, (m) => ({ ...m, importante: !m.importante }))}
                className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-white text-[var(--principal)]"
              >
                {mensajeAbierto.importante ? <IconStarFilled size={18} /> : <IconStar size={18} stroke={2} />}
              </button>
              <button
                type="button"
                aria-label={t.responder}
                onClick={() => responder(mensajeAbierto)}
                className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-white text-neutral-900"
              >
                <IconArrowBackUp size={18} stroke={2} />
              </button>
              {abierto.caja !== "eliminados" && (
                <button
                  type="button"
                  aria-label={t.eliminar}
                  onClick={() => setAccion("eliminar")}
                  className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-white text-neutral-900"
                >
                  <IconTrash size={18} stroke={2} />
                </button>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-sm border-4 border-[var(--marco)] bg-[var(--tile)]">
                <DetalleIcono size={24} stroke={2} />
              </span>
              <dl className="min-w-0 space-y-1 text-sm">
                <div>
                  <dt className="inline font-bold">{t.de}: </dt>
                  <dd className="inline">{mensajeAbierto.de ?? t.yo}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">{t.para}: </dt>
                  <dd className="inline">{mensajeAbierto.para ?? t.yo}</dd>
                </div>
              </dl>
            </div>
            <h2 className="break-words text-base font-bold">{mensajeAbierto.asunto || t.sinAsunto}</h2>
            <p className="-mt-1 text-right text-[11px] text-neutral-500">
              {formatearFecha(mensajeAbierto.fecha, idioma)} · {formatearHora(mensajeAbierto.fecha, reloj, idioma)}
            </p>
            <article className="whitespace-pre-wrap break-words rounded-sm border-2 border-[var(--marco)] bg-neutral-50 p-3 leading-relaxed text-neutral-900">
              {mensajeAbierto.cuerpo}
            </article>
            {mensajeAbierto.attachments?.map((attachment, index) => <div key={`${mensajeAbierto.id}-${index}`} className="rounded border p-2 text-sm">{attachment.type === "image" && attachment.imageData ? <img src={attachment.imageData} alt={t.regalo} className="max-h-48 max-w-full object-contain" /> : <span>{attachment.card?.nombre ?? (attachment.type === "item" ? "Reloj de arena" : attachment.key)} ×{attachment.quantity}</span>}</div>)}
          </div>
        </div>
      )}

      {redactando && (
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-white">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.volver}
                onClick={() => setAccion("descartar")}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-neutral-900"
              >
                <IconArrowLeft size={18} stroke={2} />
              </button>
              <p className="font-bold tracking-wider text-[var(--principal)]">{t.redactar}</p>
            </div>

            <div className="flex flex-1 gap-3">
              <div className="flex w-24 flex-none flex-col gap-3">
                {giftMode ? <label className="flex flex-col gap-1 text-xs font-bold">{idioma === "es" ? "Usuario" : "Username"}<input value={giftUsername} onChange={(event) => setGiftUsername(event.target.value)} placeholder="usuario-123abc" className="w-24 rounded border px-1 py-2 font-normal" /></label> : <button
                  type="button"
                  aria-label={t.elegirDestinatario}
                  onClick={() => setEligiendo(true)}
                  className="flex flex-col gap-1"
                >
                  <span className={`flex aspect-square items-center justify-center rounded-sm border-4 border-[var(--marco)] text-white ${destino ? `bg-gradient-to-br ${destino.gradiente}` : "bg-red-600"}`}><IconUser size={40} stroke={1.5} /></span>
                  <span className="truncate text-center text-xs font-bold text-neutral-900">{destino ? nombreDe(destino) : t.para}</span>
                </button>}
                <div className="flex flex-col items-center gap-1 rounded-sm border-4 border-[var(--marco)] bg-white p-1">
                  <p className="text-xs font-bold">{t.icono}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(ICONOS) as Icono[]).map((id) => {
                      const Icono = ICONOS[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-label={t.tipos[id]}
                          aria-pressed={borrador.icono === id}
                          onClick={() => setBorrador({ ...borrador, icono: id })}
                          className={`flex h-9 w-9 items-center justify-center rounded-sm border-2 ${
                            borrador.icono === id ? "border-[var(--acento)] bg-[var(--tile)]" : "border-neutral-300"
                          }`}
                        >
                          <Icono size={18} stroke={2} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button type="button" aria-pressed={giftMode} onClick={() => { setGiftMode((value) => !value); setGiftError(""); }} className={`flex min-h-20 flex-none flex-col items-center justify-center gap-1 rounded-sm border-4 border-[var(--marco)] p-1 text-center text-xs font-bold ${giftMode ? "bg-[var(--tile)]" : "bg-neutral-100"}`}>
                  <IconGift size={22} stroke={2} />{t.regalo}
                </button>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {giftMode && <div className="space-y-2 rounded border border-[var(--acento)] p-2 text-xs">
                  <label className="block">{idioma === "es" ? "Adjuntar carta propia" : "Attach owned card"}<select value={giftCardKey} onChange={(event) => setGiftCardKey(event.target.value)} className="mt-1 w-full rounded border p-1"><option value="">—</option>{(inventoryQuery.data?.inventory ?? []).map((card) => <option key={card.cardKey} value={card.cardKey}>{card.nombre} ×{card.quantity}</option>)}</select></label>
                  {giftCardKey && <label className="block">{idioma === "es" ? "Copias" : "Copies"}<input type="number" min={1} max={inventoryQuery.data?.inventory.find((card) => card.cardKey === giftCardKey)?.quantity ?? 1} value={giftCardQuantity} onChange={(event) => setGiftCardQuantity(Number(event.target.value))} className="ml-2 w-16 rounded border p-1" /></label>}
                  <label className="block">Relojes de arena <input type="number" min={0} max={inventoryQuery.data?.items?.find((item) => item.itemKey === "hourglass")?.quantity ?? 0} value={giftHourglasses} onChange={(event) => setGiftHourglasses(Number(event.target.value))} className="ml-2 w-16 rounded border p-1" /></label>
                  <label className="block">{idioma === "es" ? "Adjuntar imagen" : "Attach image"}<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block max-w-full" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { setGiftError(idioma === "es" ? "La imagen debe pesar menos de 2 MB." : "Image must be smaller than 2 MB."); return; } const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === "string") setGiftImageData(reader.result); }; reader.readAsDataURL(file); }} /></label>
                  {giftError && <p role="alert" className="text-rose-700">{giftError}</p>}
                </div>}
                <label className="flex flex-col gap-1 font-bold">
                  {t.asunto}
                  <input
                    value={borrador.asunto}
                    onChange={(e) => setBorrador({ ...borrador, asunto: e.target.value })}
                    className="rounded-sm border-2 border-neutral-400 px-2 py-1 font-normal"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 font-bold">
                  {t.cuerpo}
                  <textarea
                    value={borrador.cuerpo}
                    onChange={(e) => setBorrador({ ...borrador, cuerpo: e.target.value })}
                    className="min-h-32 flex-1 resize-none rounded-sm border-2 border-neutral-400 px-2 py-1 font-normal"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAccion("guardar")}
                className="rounded-sm border-2 border-[var(--acento)] bg-white px-1 py-2 text-neutral-900"
              >
                {t.guardar}
              </button>
              <button
                type="button"
                onClick={() => setAccion("reescribir")}
                className="rounded-sm border-2 border-[var(--acento)] bg-white px-1 py-2 text-neutral-900"
              >
                {t.reescribir}
              </button>
              <button
                type="button"
                disabled={(!giftMode && !destino) || (giftMode && !giftUsername.trim()) || !borrador.asunto.trim() || sendGift.isPending}
                onClick={() => setAccion("enviar")}
                className="rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] px-1 py-2 text-neutral-900 disabled:opacity-40"
              >
                {t.enviar}
              </button>
            </div>
          </div>
          {selector}
        </div>
      )}

      {dialogo}
    </div>
  );
}
