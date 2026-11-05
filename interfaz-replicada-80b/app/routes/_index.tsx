import { lazy, Suspense, useEffect, useState, type ChangeEvent, type CSSProperties } from "react";
import { actionErrorMessage, signOut, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { APP_TITLE } from "@/lib/app-config";
import type { Amigo } from "@/lib/hermanos";
import { RELOJ_INICIAL, type Reloj } from "@/lib/hora";
import {
  SONIDO_MENU,
  SONIDO_SLOT,
  establecerSonidoActivo,
  establecerVolumen,
  reproducirSonido,
} from "@/lib/sonidos";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconBolt from "@tabler/icons-react/dist/esm/icons/IconBolt.mjs";
import IconSettings from "@tabler/icons-react/dist/esm/icons/IconSettings.mjs";
import IconLogout from "@tabler/icons-react/dist/esm/icons/IconLogout.mjs";
import IconUser from "@tabler/icons-react/dist/esm/icons/IconUser.mjs";
import IconUsers from "@tabler/icons-react/dist/esm/icons/IconUsers.mjs";

const BCardColeccion = lazy(() => import("@/components/cartas/BCardColeccion").then((module) => ({ default: module.BCardColeccion })));
const AvatarCropDialog = lazy(() => import("@/components/profile/AvatarCropDialog").then((module) => ({ default: module.AvatarCropDialog })));
const PanelAlAire = lazy(() => import("@/components/cartas/PanelAlAire").then((module) => ({ default: module.PanelAlAire })));
const NavegadorCartas = lazy(() => import("@/components/cartas/NavegadorCartas").then((module) => ({ default: module.NavegadorCartas })));
const AjustesHora = lazy(() => import("@/components/ajustes/AjustesHora").then((module) => ({ default: module.AjustesHora })));
const PanelCorreo = lazy(() => import("@/components/correo/PanelCorreo").then((module) => ({ default: module.PanelCorreo })));
const PanelHermano = lazy(() => import("@/components/hermano/PanelHermano").then((module) => ({ default: module.PanelHermano })));
const PanelConectar = lazy(() => import("@/components/hermano/PanelConectar").then((module) => ({ default: module.PanelConectar })));
const PanelObjetos = lazy(() => import("@/components/cartas/PanelObjetos").then((module) => ({ default: module.PanelObjetos })));

export function meta() {
  return [
    { title: APP_TITLE },
    { name: "description", content: `${APP_TITLE} app canvas` },
  ];
}

type Idioma = "es" | "en";
type Slot = "personal" | "mega" | "hermano";
type Vista = "cart" | "objeto" | "biblio" | "guard" | "aire" | "conect" | "correo";
type Seccion = "menu" | "perfil" | "tema" | "hora";
type Perfil = { nombre: string; usuario: string; descripcion: string };

type Tema = {
  nombre: string;
  leo: string;
  principal: string;
  marco: string;
  acento: string;
  fondo: string;
  rejilla: string;
  boton: string;
  botonFin: string;
  botonBorde: string;
  tile: string;
};

const TEMAS: Tema[] = [
  {
    nombre: "Rojo fuego",
    leo: "C.UNI",
    principal: "#dc2626",
    marco: "#ef4444",
    acento: "#fde047",
    fondo: "#fdf6ee",
    rejilla: "#f2d9cf",
    boton: "#84cc16",
    botonFin: "#22c55e",
    botonBorde: "#166534",
    tile: "#fbbf24",
  },
  {
    nombre: "Rojo-naranja",
    leo: "LEO",
    principal: "#e02d12",
    marco: "#f0432a",
    acento: "#fecaca",
    fondo: "#fff4f1",
    rejilla: "#fcc9bd",
    boton: "#f87461",
    botonFin: "#ef4a2e",
    botonBorde: "#8f1d0c",
    tile: "#fca08c",
  },
  {
    nombre: "Azul cielo",
    leo: "PEGASUS",
    principal: "#0284c7",
    marco: "#38bdf8",
    acento: "#bae6fd",
    fondo: "#f0f9ff",
    rejilla: "#bae6fd",
    boton: "#38bdf8",
    botonFin: "#0ea5e9",
    botonBorde: "#075985",
    tile: "#7dd3fc",
  },
  {
    nombre: "Verde bosque",
    leo: "DRAGON",
    principal: "#166534",
    marco: "#22c55e",
    acento: "#bef264",
    fondo: "#f0fdf4",
    rejilla: "#bbf7d0",
    boton: "#4ade80",
    botonFin: "#16a34a",
    botonBorde: "#14532d",
    tile: "#d9f99d",
  },
  {
    nombre: "Oro caramelo",
    leo: "LEGEND",
    principal: "#b45309",
    marco: "#d97706",
    acento: "#fde68a",
    fondo: "#fffbeb",
    rejilla: "#fde68a",
    boton: "#fbbf24",
    botonFin: "#d97706",
    botonBorde: "#92400e",
    tile: "#fcd34d",
  },
  {
    nombre: "Morado violeta",
    leo: "RENEGADO",
    principal: "#7e22ce",
    marco: "#a855f7",
    acento: "#e9d5ff",
    fondo: "#faf5ff",
    rejilla: "#e9d5ff",
    boton: "#c084fc",
    botonFin: "#9333ea",
    botonBorde: "#581c87",
    tile: "#d8b4fe",
  },
  {
    nombre: "HARP",
    leo: "HARP",
    principal: "#db2777",
    marco: "#f9a8d4",
    acento: "#fce7f3",
    fondo: "#fff7fb",
    rejilla: "#fbcfe8",
    boton: "#f9a8d4",
    botonFin: "#ec4899",
    botonBorde: "#9d174d",
    tile: "#fbcfe8",
  },
];

const TEXTOS = {
  es: {
    personal: "PERSONAL",
    favoritos: "FAVORIT",
    retrato: "RETRATO DEL PERSONAJE",
    sistema: "— SISTEMA TRANSADOR —",
    equipar: "EQUIP",
    hermanosAbrev: "Herm.",
    salir: "SALIR",
    cerrarSesion: "CERRAR SESIÓN",
    confirmarCierre: "¿Seguro que quieres cerrar sesión?",
    confirmarCierreDetalle: "Tu colección y tus carpetas se conservarán.",
    cancelar: "Cancelar",
    confirmar: "Cerrar sesión",
    carta: "Carta",
    cartas: "Cartas registradas",
    coleccionVacia: "Aún no tienes Battle Cards coleccionadas.",
    partida: "Partida",
    guardada: "GUARDADA",
    sinGuardar: "SIN GUARDAR",
    conexion: "Conexión",
    conectado: "CONECTADO",
    desconectado: "DESCONECTADO",
    airePendiente: "Sección ON AIR pendiente de definir.",
    objetos: ["Recuperación", "Antídoto", "Llave de red"],
    slots: { personal: "PERSNL", mega: "MEGA", hermano: "HERMNO" },
    ajustes: "AJUSTES",
    volver: "Volver",
    perfil: "PERFIL",
    tema: "TEMA",
    horaFecha: "HORA Y FECHA",
    idioma: "IDIOMA",
    sonido: "SONIDO",
    activado: "ACTIVADO",
    desactivado: "DESACTIVADO",
    volumen: "VOLUMEN",
    fotoPerfil: "Foto de perfil",
    cambiarFoto: "CAMBIAR FOTO",
    quitarFoto: "QUITAR",
    nombre: "Nombre",
    usuario: "Nombre de usuario",
    correo: "Correo privado",
    usernameQuickWindow: "Puedes corregir el nombre durante 5 minutos después de cambiarlo.",
    usernameCooldown: "Podrás cambiarlo de nuevo el",
    usernameEditable: "Puedes cambiarlo ahora. Después tendrás 5 minutos para corregirlo.",
    descripcion: "Descripción",
    menu: {
      cart: "B.CARTA",
      objeto: "OBJETO",
      biblio: "BIBLIO",
      guard: "GUARDAR",
      aire: "AL AIRE",
      conect: "CONECTAR",
      correo: "CORREO",
    },
  },
  en: {
    personal: "PERSONAL",
    favoritos: "FAVORITES",
    retrato: "CHARACTER PORTRAIT",
    sistema: "— TRANSER SYSTEM —",
    equipar: "EQUIP",
    hermanosAbrev: "Bro.",
    salir: "EXIT",
    cerrarSesion: "SIGN OUT",
    confirmarCierre: "Are you sure you want to sign out?",
    confirmarCierreDetalle: "Your collection and folders will be kept.",
    cancelar: "Cancel",
    confirmar: "Sign out",
    carta: "Card",
    cartas: "Registered cards",
    coleccionVacia: "You don't have any collected Battle Cards yet.",
    partida: "Save",
    guardada: "SAVED",
    sinGuardar: "NOT SAVED",
    conexion: "Connection",
    conectado: "CONNECTED",
    desconectado: "DISCONNECTED",
    airePendiente: "ON AIR section pending definition.",
    objetos: ["Recovery", "Antidote", "Network key"],
    slots: { personal: "PERSNL", mega: "MEGA", hermano: "BROTHR" },
    ajustes: "SETTINGS",
    volver: "Back",
    perfil: "PROFILE",
    tema: "THEME",
    horaFecha: "TIME & DATE",
    idioma: "LANGUAGE",
    sonido: "SOUND",
    activado: "ON",
    desactivado: "OFF",
    volumen: "VOLUME",
    fotoPerfil: "Profile photo",
    cambiarFoto: "CHANGE PHOTO",
    quitarFoto: "REMOVE",
    nombre: "Name",
    usuario: "Username",
    correo: "Private email",
    usernameQuickWindow: "You can correct the username for 5 minutes after changing it.",
    usernameCooldown: "You can change it again on",
    usernameEditable: "You can change it now. Afterward, you have 5 minutes to correct it.",
    descripcion: "Description",
    menu: {
      cart: "B.CARD",
      objeto: "ITEM",
      biblio: "LIBRARY",
      guard: "SAVE",
      aire: "ON AIR",
      conect: "CONNECT",
      correo: "E-MAIL",
    },
  },
} as const;

const SLOTS = [
  { id: "personal", icon: IconUser },
  { id: "mega", icon: IconBolt },
  { id: "hermano", icon: IconUsers },
] as const;

const SLOT_INFO: Record<Slot, { nombre: string; hp: string; nv: string }> = {
  personal: { nombre: "JUL STELAR", hp: "100/100", nv: "1" },
  mega: { nombre: "—", hp: "—", nv: "—" },
  hermano: { nombre: "Herm.0", hp: "—", nv: "—" },
};

const MENU: Vista[] = ["cart", "objeto", "biblio", "guard", "aire", "conect", "correo"];

const PERFIL_INICIAL: Perfil = {
  nombre: "Jul Stelar",
  usuario: "jul.stelar",
  descripcion: "Portador del Transador.",
};

const FILA_AJUSTES =
  "flex w-full items-center justify-between rounded-sm border-2 border-[var(--acento)] bg-white px-3 py-3 text-left font-bold text-neutral-900";

const ESTILO_REJILLA: CSSProperties = {
  backgroundImage:
    "linear-gradient(var(--rejilla) 1px, transparent 1px), linear-gradient(90deg, var(--rejilla) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
};

export default function HomeRoute() {
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [temaIndex, setTemaIndex] = useState(0);
  const [slot, setSlot] = useState<Slot>("personal");
  const [vista, setVista] = useState<Vista | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion | null>(null);
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_INICIAL);
  const [perfilEdit, setPerfilEdit] = useState<Perfil>(PERFIL_INICIAL);
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoEdit, setFotoEdit] = useState<string | null>(null);
  const [fotoPendiente, setFotoPendiente] = useState<string | null>(null);
  const [avisoPerfil, setAvisoPerfil] = useState("");
  const [correoPrivado, setCorreoPrivado] = useState("");
  const [profileLevel, setProfileLevel] = useState(1);
  const [profileMaxHp, setProfileMaxHp] = useState(100);
  const [activeBrotherCount, setActiveBrotherCount] = useState(0);
  const [usernameChangedAt, setUsernameChangedAt] = useState<string | null>(null);
  const [usernameQuickChangeUntil, setUsernameQuickChangeUntil] = useState<string | null>(null);
  const [usernameNow, setUsernameNow] = useState(() => Date.now());
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const bcardState = useActionQuery("get-bcard-dashboard", {});
  const profileState = useActionQuery("get-transer-profile", {});
  const saveProfile = useActionMutation("save-transer-profile");
  const creatorState = useActionQuery("get-transer-creator-status", {});
  const connectionsState = useActionQuery("get-transer-connections", { query: "" });
  const manageConnection = useActionMutation("manage-transer-connection");
  const amigos: Amigo[] = (connectionsState.data?.friends ?? []).map((friend, id) => ({
    id,
    username: friend.username,
    displayName: friend.displayName,
    avatarData: friend.avatarData,
    isBrother: friend.isBrother,
    nv: friend.level,
    gradiente: "from-pink-300 via-rose-200 to-fuchsia-400",
  }));
  const hermanos = amigos.filter((friend) => friend.isBrother);
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const [volumen, setVolumen] = useState(100);
  const [reloj, setReloj] = useState<Reloj>(RELOJ_INICIAL);

  useEffect(() => {
    const data = profileState.data;
    const saved = data?.profile;
    if (!data || !saved) return;
    const nextProfile = { nombre: saved.displayName, usuario: saved.username, descripcion: saved.description };
    setPerfil(nextProfile);
    setPerfilEdit(nextProfile);
    setFoto(saved.avatarData ?? null);
    setFotoEdit(saved.avatarData ?? null);
    setCorreoPrivado(data.email);
    setProfileLevel(saved.level);
    setProfileMaxHp(data.maxHp);
    setActiveBrotherCount(data.activeBrotherCount);
    setUsernameChangedAt(saved.usernameChangedAt ?? null);
    setUsernameQuickChangeUntil(saved.usernameQuickChangeUntil ?? null);
  }, [profileState.data?.profile]);

  const usernameAvailableAt = usernameChangedAt ? Date.parse(usernameChangedAt) + 14 * 24 * 60 * 60 * 1000 : null;
  const quickUsernameChangeOpen = Boolean(usernameQuickChangeUntil && Date.parse(usernameQuickChangeUntil) > usernameNow);
  const canChangeUsername = !usernameChangedAt || quickUsernameChangeOpen || (usernameAvailableAt !== null && usernameNow >= usernameAvailableAt);
  const usernameNextTransition = quickUsernameChangeOpen && usernameQuickChangeUntil
    ? Date.parse(usernameQuickChangeUntil)
    : canChangeUsername ? null : usernameAvailableAt;

  useEffect(() => {
    if (usernameNextTransition === null) return;
    const timeout = window.setTimeout(() => setUsernameNow(Date.now()), Math.max(0, usernameNextTransition - Date.now() + 1));
    return () => window.clearTimeout(timeout);
  }, [usernameNextTransition]);

  const cambiarVolumen = (delta: number) => {
    const siguiente = Math.min(100, Math.max(0, volumen + delta));
    establecerVolumen(siguiente);
    setVolumen(siguiente);
  };

  const t = TEXTOS[idioma];
  const tema = TEMAS[temaIndex];
  const info = { ...SLOT_INFO[slot], hp: `${profileMaxHp}/${profileMaxHp}`, nv: String(profileLevel) };

  const variablesTema = {
    "--principal": tema.principal,
    "--marco": tema.marco,
    "--acento": tema.acento,
    "--fondo": tema.fondo,
    "--rejilla": tema.rejilla,
    "--boton": tema.boton,
    "--botonFin": tema.botonFin,
    "--botonBorde": tema.botonBorde,
    "--tile": tema.tile,
  } as CSSProperties;

  const actualizarPerfil = (campo: keyof Perfil, valor: string) =>
    setPerfilEdit((actual) => ({ ...actual, [campo]: valor }));

  const cargarFoto = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > 2_000_000) {
      setAvisoPerfil(idioma === "es" ? "La imagen debe pesar menos de 2 MB." : "Image must be smaller than 2 MB.");
      evento.target.value = "";
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") setFotoPendiente(lector.result);
    };
    lector.readAsDataURL(archivo);
    evento.target.value = "";
  };

  const renderVista = () => {
    switch (vista) {
      case "cart":
        return <BCardColeccion idioma={idioma} />;
      case "objeto":
        return <PanelObjetos idioma={idioma} />;
      case "biblio":
        return <NavegadorCartas idioma={idioma} />;
      case "guard":
        return (
          <button
            type="button"
            onClick={() => setGuardado((g) => !g)}
            className="rounded-sm border-2 border-[var(--acento)] px-3 py-1"
          >
            {t.partida}: {guardado ? t.guardada : t.sinGuardar}
          </button>
        );
      case "conect":
        return <PanelConectar idioma={idioma} />;
      case "aire":
        return <PanelAlAire idioma={idioma} />;
      default:
        return null;
    }
  };

  const tituloSeccion =
    seccion === "perfil"
      ? `${t.ajustes} > ${t.perfil}`
      : seccion === "tema"
        ? `${t.ajustes} > ${t.tema}`
        : seccion === "hora"
          ? `${t.ajustes} > ${t.horaFecha}`
          : t.ajustes;

  return (
    <div
      className="transer-shell flex h-dvh w-full justify-center overflow-x-hidden bg-neutral-900"
      style={variablesTema}
    >
      <div className="flex h-dvh min-h-0 w-full max-w-[420px] flex-col overflow-hidden bg-[var(--fondo)] font-mono text-neutral-900 shadow-2xl sm:max-w-[680px] lg:max-w-[900px]">
        <header className="relative flex-none bg-[var(--principal)] px-4 py-2 text-center font-mono text-2xl tracking-[0.25em] text-white">
          <button
            type="button"
            onClick={() => setSeccion(seccion ? null : "menu")}
            aria-label={t.ajustes}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] text-neutral-900"
          >
            <IconSettings size={20} stroke={2} />
          </button>
          {seccion ? t.ajustes : vista ? t.menu[vista] : t.slots[slot]}
          <button
            type="button"
            onClick={() => setIdioma((i) => (i === "es" ? "en" : "es"))}
            className="absolute right-3 top-1/2 min-h-11 -translate-y-1/2 rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] px-3 py-1 text-sm font-bold tracking-normal text-neutral-900"
          >
            {idioma.toUpperCase()}
          </button>
        </header>

        {seccion ? (
          <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-neutral-950 px-3 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeccion(seccion === "menu" ? null : "menu")}
                aria-label={t.volver}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-neutral-900"
              >
                <IconArrowLeft size={20} stroke={2} />
              </button>
              <p className="text-sm font-bold tracking-wider text-[var(--acento)]">
                {tituloSeccion}
              </p>
            </div>

            {seccion === "menu" && (
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => setSeccion("perfil")} className={FILA_AJUSTES}>
                    {t.perfil} <span>›</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setSeccion("tema")} className={FILA_AJUSTES}>
                    {t.tema}: {tema.nombre} <span>›</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setSeccion("hora")} className={FILA_AJUSTES}>
                    {t.horaFecha} <span>›</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIdioma((i) => (i === "es" ? "en" : "es"))}
                    className={FILA_AJUSTES}
                  >
                    {t.idioma}: {idioma.toUpperCase()} <span>›</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setConfirmSignOut(true)} className={FILA_AJUSTES}>
                    {t.cerrarSesion}<IconLogout size={17} />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sonidoActivo}
                    onClick={() => {
                      const siguiente = !sonidoActivo;
                      establecerSonidoActivo(siguiente);
                      setSonidoActivo(siguiente);
                    }}
                    className={FILA_AJUSTES}
                  >
                    {t.sonido}: {sonidoActivo ? t.activado : t.desactivado}
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-11 items-center rounded-sm border-2 border-[var(--acento)] px-0.5 ${
                        sonidoActivo ? "justify-end bg-[var(--principal)]" : "justify-start bg-neutral-300"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-sm bg-white" />
                    </span>
                  </button>
                </li>
                <li className={`${FILA_AJUSTES} justify-between ${sonidoActivo ? "" : "opacity-50"}`}>
                  <span>{t.volumen}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="-"
                      disabled={!sonidoActivo || volumen === 0}
                      onClick={() => cambiarVolumen(-10)}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-lg disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-12 text-center tabular-nums">{volumen}%</span>
                    <button
                      type="button"
                      aria-label="+"
                      disabled={!sonidoActivo || volumen === 100}
                      onClick={() => cambiarVolumen(10)}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] text-lg disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </li>
              </ul>
            )}

            {seccion === "perfil" && (
              <div className="flex flex-col gap-3 rounded-sm border-4 border-[var(--acento)] bg-white p-3 text-neutral-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden border-4 border-[var(--marco)] bg-teal-300 p-2 text-center text-xs text-teal-900">
                    {fotoEdit ? (
                      <img src={fotoEdit} alt={t.fotoPerfil} className="h-full w-full object-cover" />
                    ) : (
                      t.retrato
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer rounded-sm border-2 border-[var(--acento)] bg-[var(--principal)] px-2 py-1 text-center text-sm font-bold text-white">
                      {t.cambiarFoto}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={cargarFoto}
                        className="sr-only"
                      />
                    </label>
                    {fotoEdit && (
                      <button
                        type="button"
                        onClick={() => setFotoEdit(null)}
                        className="rounded-sm border-2 border-neutral-400 px-2 py-1 text-sm"
                      >
                        {t.quitarFoto}
                      </button>
                    )}
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-sm font-bold">
                  {t.nombre}
                  <input
                    value={perfilEdit.nombre}
                    onChange={(e) => actualizarPerfil("nombre", e.target.value)}
                    className="rounded-sm border-2 border-neutral-400 px-2 py-1 font-normal"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-bold">
                  {t.usuario}
                  <input value={perfilEdit.usuario} onChange={(e) => actualizarPerfil("usuario", e.target.value)} disabled={!canChangeUsername} className="rounded-sm border-2 border-neutral-400 px-2 py-1 font-normal disabled:bg-neutral-100 disabled:text-neutral-500" />
                  <span className="text-xs font-normal text-neutral-600">{canChangeUsername ? (quickUsernameChangeOpen ? t.usernameQuickWindow : t.usernameEditable) : `${t.usernameCooldown} ${new Date(usernameAvailableAt!).toLocaleString(idioma === "es" ? "es-VE" : "en-US")}`}</span>
                </label>
                <label className="flex flex-col gap-1 text-sm font-bold">
                  {t.correo}
                  <input value={correoPrivado} readOnly className="rounded-sm border-2 border-neutral-400 bg-neutral-100 px-2 py-1 font-normal" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-bold">
                  {t.descripcion}
                  <textarea
                    rows={3}
                    value={perfilEdit.descripcion}
                    onChange={(e) => actualizarPerfil("descripcion", e.target.value)}
                    className="rounded-sm border-2 border-neutral-400 px-2 py-1 font-normal"
                  />
                </label>
                {avisoPerfil && <p role="status" className="text-sm text-rose-700">{avisoPerfil}</p>}
                <button type="button" disabled={saveProfile.isPending || profileState.isLoading} onClick={() => saveProfile.mutate({ username: perfilEdit.usuario, displayName: perfilEdit.nombre, description: perfilEdit.descripcion, avatarData: fotoEdit }, { onSuccess: (result) => { const saved = { nombre: result.profile.displayName, usuario: result.profile.username, descripcion: result.profile.description }; setPerfil(saved); setPerfilEdit(saved); setFoto(result.profile.avatarData); setFotoEdit(result.profile.avatarData); setUsernameChangedAt(result.profile.usernameChangedAt); setUsernameQuickChangeUntil(result.profile.usernameQuickChangeUntil); setAvisoPerfil(idioma === "es" ? "Perfil guardado." : "Profile saved."); }, onError: (error) => setAvisoPerfil(actionErrorMessage(error) ?? (idioma === "es" ? "No se pudo guardar el perfil." : "Could not save profile.")) })} className="rounded-sm border-2 border-[var(--botonBorde)] bg-gradient-to-b from-[var(--boton)] to-[var(--botonFin)] px-4 py-2 font-bold text-white disabled:opacity-50">{saveProfile.isPending ? (idioma === "es" ? "GUARDANDO…" : "SAVING…") : (idioma === "es" ? "GUARDAR" : "SAVE")}</button>
                {creatorState.data?.isCreator && <button type="button" onClick={() => void import("@/components/cartas/print-bcard-catalog").then(({ printBcardCatalog }) => printBcardCatalog(idioma))} className="rounded-sm border-2 border-fuchsia-800 bg-fuchsia-600 px-4 py-2 font-bold text-white">{idioma === "es" ? "CREAR PDF DEL CATÁLOGO" : "CREATE CATALOG PDF"}</button>}
              </div>
            )}

            {seccion === "hora" && (
              <Suspense fallback={<div className="p-3 text-xs text-neutral-500">Cargando…</div>}>
                <AjustesHora idioma={idioma} reloj={reloj} onCambiar={setReloj} />
              </Suspense>
            )}

            {seccion === "tema" && (
              <div className="flex flex-col gap-2">
                {TEMAS.map((opcion, i) => (
                  <button
                    key={opcion.nombre}
                    type="button"
                    aria-pressed={temaIndex === i}
                    onClick={() => setTemaIndex(i)}
                    style={{ backgroundColor: opcion.principal }}
                    className={`flex w-full items-center justify-between rounded-sm border-2 border-white px-3 py-3 font-bold text-white ${
                      temaIndex === i ? "ring-4 ring-white" : ""
                    }`}
                  >
                    <span>{opcion.nombre}</span>
                    <span className="text-xs tracking-widest">{opcion.leo}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : vista === "correo" ? (
          <div className="flex min-h-0 flex-1 flex-col border-b-4 border-[var(--acento)] bg-white text-sm text-neutral-900">
            <Suspense fallback={<div className="p-3 text-xs text-neutral-500">Cargando correo…</div>}>
              <PanelCorreo idioma={idioma} amigos={amigos} reloj={reloj} />
            </Suspense>
          </div>
        ) : vista ? (
          <div className="min-h-0 flex-1 overflow-y-auto border-b-4 border-[var(--acento)] bg-white p-3 text-sm text-neutral-900">
            <Suspense fallback={<div className="p-3 text-center text-xs text-neutral-500" role="status">Cargando apartado…</div>}>
              {renderVista()}
            </Suspense>
          </div>
        ) : slot === "hermano" ? (
          <section
            className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3"
            style={ESTILO_REJILLA}
          >
            <Suspense fallback={<div className="p-3 text-xs text-neutral-500">Cargando hermanos…</div>}>
              <PanelHermano
                idioma={idioma}
                nombre={perfil.nombre}
                foto={foto}
                nivel={String(profileLevel)}
                amigos={hermanos}
              onRemove={(username) => manageConnection.mutate({ operation: "set-brother", username, enabled: false }, { onSuccess: () => void connectionsState.refetch() })}
              />
            </Suspense>
          </section>
        ) : slot === "mega" ? (
          <section className="relative min-h-0 flex-1 overflow-y-auto bg-[#101426] p-4 text-white" style={{ backgroundImage: "radial-gradient(circle at 15% 10%, rgba(217,70,239,.24), transparent 35%), linear-gradient(135deg, #101426, #17152f 55%, #111827)" }}>
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-[1fr_1.2fr]">
              <div className="flex min-h-56 items-center justify-center overflow-hidden border-4 border-fuchsia-300 bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 shadow-[0_0_30px_rgba(217,70,239,0.25)]">{foto ? <img src={foto} alt={t.fotoPerfil} className="h-full max-h-80 w-full object-cover opacity-90 mix-blend-screen" /> : <IconBolt size={96} className="text-fuchsia-200" stroke={1} />}</div>
              <div className="flex flex-col justify-center gap-4 border-2 border-fuchsia-400/60 bg-slate-950/70 p-4">
                <p className="text-xs font-bold tracking-[0.35em] text-fuchsia-200">MEGA PROFILE</p>
                <h2 className="text-2xl font-black tracking-widest">{perfil.nombre.toUpperCase()}</h2>
                <p className="border-l-2 border-pink-400 pl-3 text-sm leading-relaxed text-slate-200">{perfil.descripcion || (idioma === "es" ? "Perfil PERSONAL" : "PERSONAL profile")}</p>
                <div className="grid grid-cols-2 gap-2 text-xs"><span className="border border-indigo-300/50 p-2 text-indigo-100">{idioma === "es" ? "PERFIL" : "PROFILE"}<strong className="mt-1 block text-sm text-emerald-300">{perfil.usuario}</strong></span><span className="border border-indigo-300/50 p-2 text-indigo-100">{idioma === "es" ? "MODO" : "MODE"}<strong className="mt-1 block text-sm text-pink-200">MEGA</strong></span></div>
              </div>
            </div>
          </section>
        ) : (
            <section
              className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3"
              style={ESTILO_REJILLA}
            >
              <div className="flex gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="rounded-sm border-4 border-[var(--marco)] bg-white px-3 py-2 text-center text-xl tracking-[0.2em]">
                    {perfil.nombre.toUpperCase()}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-sm border-4 border-[var(--marco)] bg-white px-2 py-1">
                      <p className="text-xs font-bold text-[var(--principal)]">HP</p>
                      <p className="text-center text-lg">{info.hp}</p>
                    </div>
                    <div className="w-20 rounded-sm border-4 border-[var(--marco)] bg-white px-2 py-1">
                      <p className="text-xs font-bold text-[var(--principal)]">NV</p>
                      <p className="text-center text-lg">{info.nv}</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-28 flex-none flex-col gap-3 sm:w-36">
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-sm border-4 border-[var(--marco)] bg-teal-300 p-2 text-center text-sm text-teal-900">
                    {foto ? (
                      <img src={foto} alt={t.fotoPerfil} className="h-full w-full object-cover" />
                    ) : (
                      t.retrato
                    )}
                  </div>
                  <div className="rounded-sm border-4 border-[var(--marco)] bg-white px-2 py-1 text-center text-xl">
                    {t.hermanosAbrev} {activeBrotherCount}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-4 border-[var(--acento)] bg-white p-2">
                <p className="text-sm font-bold tracking-wider text-[var(--principal)]">
                  {t.favoritos}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }, (_, index) => {
                    const favorite = bcardState.data?.favorites.find((item) => item.slot === index);
                    const favoriteCard = favorite ? bcardState.data?.inventory.find((item) => item.cardKey === favorite.cardKey) : null;
                    return <button type="button" key={index} aria-label={`${t.carta} ${index + 1}`} className="bcard-profile-favorite" onClick={() => { setVista("cart"); setSeccion(null); }}>
                      {favoriteCard?.archivo ? <img src={`/cartas/${favoriteCard.archivo}`} alt={favoriteCard.nombre} /> : <span>{index + 1}</span>}
                    </button>;
                  })}
                </div>
              </div>
            </section>
        )}

        <div className="flex-none border-y-4 border-[var(--acento)] bg-[var(--principal)] py-1 text-center font-mono text-base tracking-[0.2em] text-[var(--acento)]">
              {t.sistema}
            </div>

            <section className="flex flex-none flex-col gap-1.5 bg-neutral-950 px-2 pt-2 sm:gap-2 sm:px-3 sm:pt-3">
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map(({ id, icon: Icon }) => (
                  <div key={id} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSlot(id);
                        setVista(null);
                        setSeccion(null);
                        reproducirSonido(SONIDO_SLOT[id]);
                      }}
                      aria-pressed={slot === id}
                      className={`flex h-14 w-full items-center justify-between rounded-sm border-2 border-[var(--acento)] bg-[var(--tile)] px-2 text-neutral-900 ${
                        slot === id ? "ring-4 ring-[var(--acento)]" : ""
                      }`}
                    >
                      <span className="text-sm font-bold">{t.slots[id]}</span>
                      <Icon size={28} stroke={1.8} />
                    </button>
                    <span
                      aria-current={slot === id ? "true" : undefined}
                      className={`inline-flex h-6 self-start items-center rounded-sm border px-2 text-[9px] font-bold tracking-wider ${
                        slot === id
                          ? "border-green-500 bg-green-700 text-green-100"
                          : "border-neutral-700 bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {t.equipar}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {MENU.map((id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => {
                      setVista(vista === id ? null : id);
                      setSeccion(null);
                      reproducirSonido(SONIDO_MENU[id]);
                    }}
                    aria-pressed={vista === id}
                    className={`flex h-12 min-w-0 items-center justify-center rounded-sm border-b-4 border-[var(--botonBorde)] bg-gradient-to-b from-[var(--boton)] to-[var(--botonFin)] px-1 text-center font-mono text-[clamp(0.625rem,2.8vw,0.875rem)] font-bold leading-tight tracking-normal text-white sm:tracking-wide ${
                      vista === id ? "ring-4 ring-[var(--acento)]" : ""
                    }`}
                  >
                    {t.menu[id]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setVista(null);
                    setSeccion(null);
                  }}
                  className="flex h-12 min-w-0 items-center justify-center rounded-sm border-b-4 border-[var(--botonBorde)] bg-gradient-to-b from-[var(--boton)] to-[var(--botonFin)] px-1 text-center font-mono text-[clamp(0.625rem,2.8vw,0.875rem)] font-bold leading-tight text-white"
                >
                  ⓑ{t.salir}
                </button>
              </div>

            </section>

        <div className="flex-none grid grid-cols-4 gap-2 bg-neutral-950 px-3 pb-2 pt-1">
          <div className="rounded-sm border-2 border-neutral-400 bg-neutral-950 px-2 py-1 text-center text-white">
            <p className="text-[10px] font-bold">HP</p>
            <p className="text-sm">820/820</p>
          </div>
          <div className="rounded-sm border-2 border-neutral-400 bg-neutral-950 px-2 py-1 text-center text-white">
            <p className="text-[10px] font-bold">ZENNY</p>
            <p className="text-sm">{bcardState.data?.zenyBalance ?? 10} Z</p>
          </div>
          <div className="rounded-sm border-2 border-neutral-400 bg-neutral-950 px-2 py-1 text-center text-white">
            <p className="text-[10px] font-bold">&nbsp;</p>
            <p className="text-sm tracking-widest">{tema.leo}</p>
          </div>
          <button
            type="button"
            onClick={() => setTemaIndex((i) => (i + 1) % TEMAS.length)}
            title={tema.nombre}
            className="rounded-sm border-2 border-neutral-400 bg-[var(--principal)] px-2 py-1 text-center text-sm font-bold text-white"
          >
            COLOR
          </button>
        </div>
      </div>
      {fotoPendiente && <Suspense fallback={null}><AvatarCropDialog source={fotoPendiente} idioma={idioma} onCancel={() => setFotoPendiente(null)} onSave={(data) => { setFotoEdit(data); setFotoPendiente(null); setAvisoPerfil(""); }} /></Suspense>}
      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmarCierre}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmarCierreDetalle}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancelar}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void signOut()}>{t.confirmar}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
