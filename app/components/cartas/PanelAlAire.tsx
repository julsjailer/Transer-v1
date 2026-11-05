import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

import { printBcardCatalog } from "@/components/cartas/print-bcard-catalog";
import { STORE_ITEMS } from "@/lib/bcard-store";
import {
  CARTAS,
  CARTA_POR_CLAVE,
  CLASES,
  claveDeCarta,
  type Idioma,
} from "@/lib/cartas";
import { reproducirSonido, SONIDO_EVENTO } from "@/lib/sonidos";

type ScanSource = "qr" | "image" | "search";
type AireTab =
  | "cardex"
  | "discoveries"
  | "scan"
  | "published"
  | "events"
  | "zeny"
  | "store"
  | "admin";

const TEXT = {
  es: {
    title: "AL AIRE · CARDEX",
    cardex: "CARDEX",
    scanner: "ESCANEAR CARTA DE BATALLA",
    published: "CATÁLOGO PÚBLICO",
    discoveries: "REGISTROS",
    store: "TIENDA",
    admin: "ADMINISTRACIÓN",
    events: "EVENTOS",
    zeny: "ZENYS",
    search: "Buscar carta…",
    scan: "Escanear Carta de Batalla",
    discovered: "Descubierta",
    owned: "En colección",
    notOwned: "No está en colección",
    camera: "Activar cámara",
    cameraOff: "Detener cámara",
    noCamera:
      "La cámara no está disponible en este navegador. Busca la carta o usa una imagen para identificarla.",
    image: "Comparar con una imagen",
    noImage: "No se guardan las imágenes de identificación.",
    pdf: "Imprimir / guardar catálogo como PDF",
    publish: "Publicar",
    private: "Privada",
    creator: "Herramientas del creador",
    public: "Disponible para usuarios",
    code: "Código de canje",
    redeem: "Canjear",
    balance: "Saldo",
    amount: "Zenys por código",
    count: "Cantidad de códigos",
    createCodes: "Generar códigos de un uso",
    generated: "Códigos (se muestran una sola vez)",
    copy: "Copiar códigos",
    copied: "Copiados",
    saved: "Carta registrada y añadida a tu colección.",
    empty: "No hay cartas publicadas todavía.",
    error: "No se pudo completar la acción.",
    admins: "Administradores de Transer",
    grantAdmin: "Autorizar administrador",
    transferOwner: "Transferir propiedad",
    transferWarning:
      "La propiedad y sus controles pasarán a otra cuenta registrada. ¿Continuar?",
  },
  en: {
    title: "ON AIR · CARDEX",
    cardex: "CARDEX",
    scanner: "SCAN BATTLE CARD",
    published: "PUBLIC CATALOG",
    discoveries: "RECORDS",
    store: "STORE",
    admin: "ADMINISTRATION",
    events: "EVENTS",
    zeny: "ZENYS",
    search: "Search cards…",
    scan: "Scan Battle Card",
    discovered: "Discovered",
    owned: "In collection",
    notOwned: "Not in collection",
    camera: "Start camera",
    cameraOff: "Stop camera",
    noCamera:
      "Camera scanning is unavailable in this browser. Search for the card or use an image to identify it.",
    image: "Compare with an image",
    noImage: "Identification images are not saved.",
    pdf: "Print / save catalog as PDF",
    publish: "Publish",
    private: "Private",
    creator: "Creator tools",
    public: "Available to users",
    code: "Redemption code",
    redeem: "Redeem",
    balance: "Balance",
    amount: "Zeny per code",
    count: "Number of codes",
    createCodes: "Generate single-use codes",
    generated: "Codes (shown once)",
    copy: "Copy codes",
    copied: "Copied",
    saved: "Card registered and added to your collection.",
    empty: "No cards have been published yet.",
    error: "The action could not be completed.",
    admins: "Transer administrators",
    grantAdmin: "Grant admin access",
    transferOwner: "Transfer ownership",
    transferWarning:
      "Ownership and creator controls will move to another registered account. Continue?",
  },
} as const;

export function PanelAlAire({
  idioma,
  initialTab = "cardex",
}: {
  idioma: Idioma;
  initialTab?: Extract<AireTab, "cardex" | "events">;
}) {
  const t = TEXT[idioma];
  const [tab, setTab] = useState<AireTab>(initialTab);
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [identifiedCardKey, setIdentifiedCardKey] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [amount, setAmount] = useState(10);
  const [codeCount, setCodeCount] = useState(1);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [storeProductType, setStoreProductType] = useState<"card" | "item">(
    "card",
  );
  const [storeProductKey, setStoreProductKey] = useState("");
  const [storePrice, setStorePrice] = useState(10);
  const [storeRarity, setStoreRarity] = useState<"standard" | "mega" | "giga">(
    "standard",
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventRewardType, setEventRewardType] = useState<
    "card" | "item" | "zeny"
  >("card");
  const [eventRewardKey, setEventRewardKey] = useState("");
  const [eventRewardQuantity, setEventRewardQuantity] = useState(1);
  const [eventRewardZeny, setEventRewardZeny] = useState(10);
  const [eventGigaCards, setEventGigaCards] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);
  const ocrWorkerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(
    null,
  );

  const dashboard = useActionQuery("get-bcard-dashboard", {});
  const cardexRecords = useActionQuery("get-bcard-cardex-identifications", {});
  const identifyCard = useActionMutation("identify-bcard-cardex");
  const cardexRows = (cardexRecords.data ?? []) as Array<{
    cardKey: string;
    identifiedAt: string;
    nombre: string;
    archivo: string | null;
  }>;
  const creator = useActionQuery("get-transer-creator-status", {});
  const published = useActionQuery("get-published-bcard-catalog", {});
  const store = useActionQuery("get-bcard-store", {});
  const events = useActionQuery("get-transer-events", {});
  const scanCard = useActionMutation("scan-bcard");
  const buyStoreItem = useActionMutation("buy-bcard-store-item");
  const setStoreListing = useActionMutation("set-bcard-store-listing");
  const createEvent = useActionMutation("create-transer-event");
  const claimEvent = useActionMutation("claim-transer-event");
  const setPublication = useActionMutation("set-bcard-catalog-publication");
  const redeem = useActionMutation("redeem-zeny-code");
  const createCodes = useActionMutation("create-zeny-codes");
  const manageCreator = useActionMutation("manage-transer-creator");
  const discoveries = new Set(
    dashboard.data?.discoveries?.map((card) => card.cardKey) ?? [],
  );
  const inventory = new Set(
    dashboard.data?.inventory?.map((card) => card.cardKey) ?? [],
  );
  const publicKeys = new Set(published.data?.map((card) => card.cardKey) ?? []);
  const filteredCards = useMemo(
    () =>
      CARTAS.filter((card) =>
        card.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      ),
    [search],
  );
  const filteredPublished = useMemo(
    () =>
      (published.data ?? []).filter((card) =>
        card.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      ),
    [published.data, search],
  );
  const listedProducts = store.data ?? [];
  const storeOptions =
    storeProductType === "card"
      ? CARTAS.map((card) => ({ key: claveDeCarta(card), name: card.nombre }))
      : STORE_ITEMS.map((item) => ({ key: item.key, name: item.name[idioma] }));

  useEffect(
    () => () => {
      stoppingRef.current = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void ocrWorkerRef.current?.terminate();
    },
    [],
  );

  useEffect(
    () => () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage);
    },
    [selectedImage],
  );

  const saveIdentification = (cardKey: string) => {
    identifyCard.mutate(
      { cardKey },
      {
        onSuccess: (record) => {
          stopCamera();
          setIdentifiedCardKey(cardKey);
          setOcrError("");
          void cardexRecords.refetch();
          if ((record as { alreadyIdentified: boolean }).alreadyIdentified) {
            setNotice(
              idioma === "es"
                ? "Esta carta ya tiene registro. Te llevé a REGISTROS."
                : "This card is already recorded. Opening RECORDS.",
            );
            setTab("discoveries");
          } else {
            setNotice(
              idioma === "es"
                ? "Carta identificada y guardada en REGISTROS."
                : "Card identified and saved to RECORDS.",
            );
          }
        },
        onError: (error) => {
          reproducirSonido(SONIDO_EVENTO.error);
          setOcrError(actionErrorMessage(error) ?? t.error);
        },
      },
    );
  };

  const identifyFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    setOcrBusy(true);
    setOcrError("");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const worker =
        ocrWorkerRef.current ??
        (await createWorker("eng", undefined, {
          workerPath: "/ocr/worker.min.js",
          corePath: "/ocr/core/tesseract-core-lstm.wasm.js",
          langPath: "/ocr/languages",
          gzip: true,
          workerBlobURL: false,
          logger: () => {},
        }));
      ocrWorkerRef.current = worker;
      const { data } = await worker.recognize(canvas);
      const normalizedText = data.text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      const match = CARTAS.find((card) => {
        const name = card.nombre
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        return name.length > 3 && normalizedText.includes(name);
      });
      if (!match) {
        setOcrError(
          idioma === "es"
            ? "No pude reconocer el nombre. Acerca la carta, mejora la luz y vuelve a escanear."
            : "I couldn't recognize the card name. Move it closer, improve lighting, and scan again.",
        );
        return;
      }
      const key = claveDeCarta(match);
      setSearch(match.nombre);
      reproducirSonido(SONIDO_EVENTO.cardSelect);
      saveIdentification(key);
    } catch {
      setOcrError(
        idioma === "es"
          ? "El escáner OCR no pudo iniciarse. Comprueba la carga de sus recursos locales."
          : "The OCR scanner could not start. Check that its local assets loaded.",
      );
    } finally {
      setOcrBusy(false);
    }
  };

  const saveDiscovery = (cardKey: string, source: ScanSource) => {
    scanCard.mutate(
      { cardKey, source },
      {
        onSuccess: (result) => {
          setNotice(
            `${result.discovered ? t.saved : idioma === "es" ? "Ya estaba descubierta; no se añadió otra copia." : "Already discovered; no extra copy was added."} · ${idioma === "es" ? "Escaneos disponibles hoy" : "Scans remaining today"}: ${result.scansRemainingToday}`,
          );
          if (source === "qr") {
            reproducirSonido(SONIDO_EVENTO.qrConfirmed);
            if (result.discovered) reproducirSonido(SONIDO_EVENTO.cardObtained);
          } else if (result.discovered)
            reproducirSonido(SONIDO_EVENTO.cardObtained);
          setCameraError("");
        },
        onError: (error) => {
          reproducirSonido(SONIDO_EVENTO.denied);
          setNotice(actionErrorMessage(error) ?? t.error);
        },
      },
    );
  };

  const startCamera = async () => {
    setCameraError("");
    const BarcodeDetectorConstructor = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => {
          detect(
            source: HTMLVideoElement,
          ): Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!BarcodeDetectorConstructor || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.noCamera);
      return;
    }
    try {
      const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      stoppingRef.current = false;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const detect = async () => {
        if (stoppingRef.current || !videoRef.current) return;
        try {
          if (videoRef.current.readyState >= 2) {
            const results = await detector.detect(videoRef.current);
            const code = results[0]?.rawValue;
            if (code && CARTA_POR_CLAVE.has(code)) {
              stoppingRef.current = true;
              stream.getTracks().forEach((track) => track.stop());
              saveDiscovery(code, "qr");
              setSearch(CARTA_POR_CLAVE.get(code)?.nombre ?? "");
              setTab("cardex");
              return;
            }
          }
        } catch {
          setCameraError(t.noCamera);
          stoppingRef.current = true;
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        window.requestAnimationFrame(() => void detect());
      };
      window.requestAnimationFrame(() => void detect());
    } catch {
      setCameraError(t.noCamera);
    }
  };

  const startCardexCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.noCamera);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      stoppingRef.current = false;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError(t.noCamera);
    }
  };

  const stopCamera = () => {
    stoppingRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const printCatalog = () => void printBcardCatalog(idioma);

  const togglePublication = (cardKey: string, isPublic: boolean) =>
    setPublication.mutate(
      { cardKey, isPublic },
      {
        onSuccess: () => setNotice(isPublic ? t.public : t.private),
        onError: (error) => setNotice(actionErrorMessage(error) ?? t.error),
      },
    );

  const tabs: AireTab[] = [
    "cardex",
    "discoveries",
    "scan",
    "published",
    "events",
    "zeny",
    "store",
  ];
  if (creator.data?.isCreator) tabs.push("admin");
  return (
    <section className="space-y-2">
      <header className="rounded border-2 border-[var(--acento)] bg-neutral-950 p-2 text-[var(--acento)]">
        <p className="text-xs tracking-[0.2em]">MEGAMAN · DATA ARCHIVE</p>
        <h2 className="text-lg font-bold">{t.title}</h2>
        <p className="mt-1 text-xs">
          {t.balance}: {dashboard.data?.zenyBalance ?? 10} Z
        </p>
      </header>
      <nav
        aria-label={
          idioma === "es" ? "Secciones de Al Aire" : "On Air sections"
        }
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
      >
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={tab === item}
            onClick={() => {
              setTab(item);
              if (item !== tab) {
                stopCamera();
                reproducirSonido(SONIDO_EVENTO.scroll);
              }
              setNotice("");
            }}
            className={`min-h-10 flex-none whitespace-nowrap rounded border-2 px-3 py-2 text-xs font-bold ${tab === item ? "border-[var(--principal)] bg-[var(--principal)] text-white" : "border-neutral-300 bg-white"}`}
          >
            {t[item]}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          role="status"
          className="rounded bg-emerald-50 p-2 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {tab === "cardex" && (
        <div className="space-y-3 rounded border bg-white p-3">
          <h3 className="font-bold">
            {idioma === "es" ? "ESCÁNER INFORMATIVO" : "INFORMATION SCANNER"}
          </h3>
          <p className="text-sm text-neutral-700">
            {idioma === "es"
              ? "Identifica una carta y consulta su información. Este escáner es ilimitado y no añade cartas a tu colección."
              : "Identify a card and view its details. This scanner is unlimited and does not add cards to your collection."}
          </p>
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full rounded bg-neutral-950 object-contain"
            autoPlay
            playsInline
            muted
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void startCardexCamera()}
              className="rounded bg-[var(--principal)] p-2 text-sm font-bold text-white"
            >
              {t.camera}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded border p-2 text-sm"
            >
              {t.cameraOff}
            </button>
          </div>
          <button
            type="button"
            disabled={ocrBusy}
            onClick={() => void identifyFromCamera()}
            className="w-full rounded bg-fuchsia-700 p-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {ocrBusy
              ? idioma === "es"
                ? "IDENTIFICANDO…"
                : "IDENTIFYING…"
              : idioma === "es"
                ? "IDENTIFICAR CARTA"
                : "IDENTIFY CARD"}
          </button>
          {cameraError && (
            <p role="alert" className="text-sm text-amber-800">
              {cameraError}
            </p>
          )}
          {ocrError && (
            <p role="alert" className="text-sm text-rose-700">
              {ocrError}
            </p>
          )}
          {identifiedCardKey &&
            (() => {
              const card = CARTA_POR_CLAVE.get(identifiedCardKey);
              if (!card) return null;
              return (
                <article className="space-y-2 rounded border-2 border-fuchsia-300 p-3">
                  {card.archivo && (
                    <img
                      src={`/cartas/${card.archivo}`}
                      alt={card.nombre}
                      className="mx-auto max-h-56 max-w-full object-contain"
                    />
                  )}
                  <h4 className="text-lg font-bold">
                    {card.id ? `#${card.id} ` : ""}
                    {card.nombre}
                  </h4>
                  <p className="text-sm">
                    {CLASES[card.clase][idioma]}
                    {card.serie ? ` · ${card.serie}` : ""}
                  </p>
                  <p className="text-sm">{card.efecto[idioma]}</p>
                  <button
                    type="button"
                    onClick={() => setTab("discoveries")}
                    className="rounded border px-3 py-2 text-sm font-bold"
                  >
                    {idioma === "es" ? "VER EN REGISTROS" : "VIEW IN RECORDS"}
                  </button>
                </article>
              );
            })()}
          <p className="text-xs text-neutral-500">
            {idioma === "es"
              ? "El reconocimiento se procesa en el dispositivo; la imagen no se guarda."
              : "Recognition is processed on this device; the image is not saved."}
          </p>
        </div>
      )}
      {tab === "scan" && (
        <div className="space-y-3 rounded border bg-white p-3">
          <h3 className="font-bold">{t.scan}</h3>
          <video
            ref={videoRef}
            className="aspect-video w-full rounded bg-neutral-950 object-cover"
            autoPlay
            playsInline
            muted
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="flex-1 rounded bg-[var(--principal)] p-2 text-sm font-bold text-white"
            >
              {t.camera}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 rounded border p-2 text-sm"
            >
              {t.cameraOff}
            </button>
          </div>
          {cameraError && (
            <p role="alert" className="text-sm text-amber-800">
              {cameraError}
            </p>
          )}
          <label className="block rounded border p-2 text-sm font-bold">
            {t.image}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-2 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setSelectedImage((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return URL.createObjectURL(file);
                });
              }}
            />
          </label>
          <p className="text-xs text-neutral-600">{t.noImage}</p>
          {selectedImage && (
            <>
              <img
                src={selectedImage}
                alt=""
                className="mx-auto max-h-48 max-w-full object-contain"
              />
              <label className="block">
                <span className="sr-only">{t.search}</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.search}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {filteredCards.slice(0, 30).map((card) => {
                  const key = claveDeCarta(card);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => saveDiscovery(key, "image")}
                      className="flex w-full items-center gap-2 rounded border p-2 text-left text-xs"
                    >
                      {card.archivo && (
                        <img
                          src={`/cartas/${card.archivo}`}
                          alt=""
                          className="h-12 w-16 object-contain"
                        />
                      )}
                      {card.nombre} · {card.id}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      {tab === "published" && (
        <>
          <label className="block">
            <span className="sr-only">{t.search}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          {creator.data?.isCreator && (
            <div className="space-y-2 rounded border-2 border-[var(--acento)] bg-white p-3">
              <h3 className="font-bold">{t.creator}</h3>
              {creator.data.isOwner && (
                <div className="space-y-2 border-b pb-3">
                  <h4 className="font-bold">{t.admins}</h4>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      manageCreator.mutate(
                        { operation: "grant", userEmail: adminEmail },
                        {
                          onSuccess: () => {
                            setAdminEmail("");
                            setNotice(t.grantAdmin);
                          },
                          onError: (error) =>
                            setNotice(actionErrorMessage(error) ?? t.error),
                        },
                      );
                    }}
                  >
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(event) => setAdminEmail(event.target.value)}
                      placeholder="user@example.com"
                      className="min-w-0 flex-1 rounded border px-2 py-2 text-xs"
                    />
                    <button className="rounded bg-[var(--principal)] px-2 text-xs font-bold text-white">
                      {t.grantAdmin}
                    </button>
                  </form>
                  <ul className="space-y-1">
                    {creator.data.admins.map((admin) => (
                      <li
                        key={admin.userEmail}
                        className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                      >
                        <span>{admin.userEmail}</span>
                        <button
                          type="button"
                          onClick={() =>
                            manageCreator.mutate(
                              {
                                operation: "revoke",
                                userEmail: admin.userEmail,
                              },
                              {
                                onSuccess: () => setNotice(t.private),
                                onError: (error) =>
                                  setNotice(
                                    actionErrorMessage(error) ?? t.error,
                                  ),
                              },
                            )
                          }
                          className="rounded border px-2 py-1"
                        >
                          {idioma === "es" ? "Revocar" : "Revoke"}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!window.confirm(t.transferWarning)) return;
                      manageCreator.mutate(
                        { operation: "transfer", userEmail: transferEmail },
                        {
                          onSuccess: () => {
                            setTransferEmail("");
                            setNotice(t.transferOwner);
                          },
                          onError: (error) =>
                            setNotice(actionErrorMessage(error) ?? t.error),
                        },
                      );
                    }}
                  >
                    <input
                      type="email"
                      required
                      value={transferEmail}
                      onChange={(event) => setTransferEmail(event.target.value)}
                      placeholder="new-owner@example.com"
                      className="min-w-0 flex-1 rounded border px-2 py-2 text-xs"
                    />
                    <button className="rounded border border-rose-700 px-2 text-xs font-bold text-rose-800">
                      {t.transferOwner}
                    </button>
                  </form>
                </div>
              )}
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filteredCards.map((card) => {
                  const key = claveDeCarta(card);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded border p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={publicKeys.has(key)}
                        onChange={(event) =>
                          togglePublication(key, event.target.checked)
                        }
                      />
                      {card.id} · {card.nombre}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {filteredPublished.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredPublished.map((card) => (
                <article
                  key={card.cardKey}
                  className="rounded border bg-white p-2"
                >
                  {card.archivo && (
                    <img
                      src={`/cartas/${card.archivo}`}
                      alt={card.nombre}
                      className="aspect-[4/3] w-full object-contain"
                    />
                  )}
                  <h3 className="text-sm font-bold">
                    {card.id} · {card.nombre}
                  </h3>
                  <p className="text-xs">{card.efecto[idioma]}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm">{t.empty}</p>
          )}
        </>
      )}
      {tab === "discoveries" && (
        <div className="space-y-2 rounded border bg-white p-3">
          <h3 className="font-bold">{t.discoveries}</h3>
          {cardexRows.length ? (
            cardexRows.map((card) => (
              <article
                key={card.cardKey}
                className={`flex items-center gap-2 border-b py-2 last:border-0 ${identifiedCardKey === card.cardKey ? "rounded bg-fuchsia-50" : ""}`}
              >
                {card.archivo && (
                  <img
                    src={`/cartas/${card.archivo}`}
                    alt=""
                    className="h-12 w-16 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{card.nombre}</p>
                  <p className="text-xs">
                    {new Date(card.identifiedAt).toLocaleString(
                      idioma === "es" ? "es-ES" : "en-US",
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifiedCardKey(card.cardKey);
                    setTab("cardex");
                  }}
                  className="rounded border px-2 py-1 text-xs font-bold"
                >
                  {idioma === "es" ? "VER" : "VIEW"}
                </button>
              </article>
            ))
          ) : (
            <p className="text-sm">
              {idioma === "es"
                ? "Aún no has identificado cartas."
                : "No identified cards yet."}
            </p>
          )}
        </div>
      )}
      {tab === "store" && (
        <div className="space-y-2 rounded border bg-white p-3">
          <h3 className="font-bold">{t.store}</h3>
          {listedProducts.length ? (
            listedProducts.map((listing) => (
              <article
                key={listing.cardKey}
                className="flex items-center gap-2 border-b py-2 last:border-0"
              >
                {listing.product.type === "card" &&
                  listing.product.card.archivo && (
                    <img
                      src={`/cartas/${listing.product.card.archivo}`}
                      alt=""
                      className="h-12 w-16 object-contain"
                    />
                  )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {listing.product.type === "card"
                      ? listing.product.name
                      : listing.product.name[idioma]}
                  </p>
                  <p className="text-xs">
                    {listing.rarity.toUpperCase()} · {listing.price} Z
                  </p>
                </div>
                <button
                  type="button"
                  disabled={buyStoreItem.isPending}
                  onClick={() =>
                    buyStoreItem.mutate(
                      {
                        productType: listing.productType as "card" | "item",
                        productKey: listing.productKey,
                      },
                      {
                        onSuccess: (result) => {
                          reproducirSonido(SONIDO_EVENTO.purchase);
                          setNotice(`${t.balance}: ${result.balance} Z`);
                          void dashboard.refetch();
                        },
                        onError: (error) =>
                          setNotice(actionErrorMessage(error) ?? t.error),
                      },
                    )
                  }
                  className="rounded bg-[var(--principal)] px-3 py-2 text-xs font-bold text-white"
                >
                  {idioma === "es" ? "Comprar" : "Buy"}
                </button>
              </article>
            ))
          ) : (
            <p className="text-sm">{t.empty}</p>
          )}
        </div>
      )}
      {tab === "admin" && creator.data?.isCreator && (
        <div className="space-y-3 rounded border-2 border-[var(--acento)] bg-white p-3">
          <h3 className="font-bold">{t.admin}</h3>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              setStoreListing.mutate(
                {
                  productType: storeProductType,
                  productKey: storeProductKey,
                  rarity: storeRarity,
                  price: storePrice,
                  listed: true,
                },
                {
                  onSuccess: () => {
                    setNotice(t.public);
                    void store.refetch();
                  },
                  onError: (error) =>
                    setNotice(actionErrorMessage(error) ?? t.error),
                },
              );
            }}
          >
            <label className="block text-xs">
              {idioma === "es" ? "Tipo de producto" : "Product type"}
              <select
                value={storeProductType}
                onChange={(event) => {
                  const next = event.target.value as "card" | "item";
                  setStoreProductType(next);
                  const options =
                    next === "card"
                      ? CARTAS.map((card) => claveDeCarta(card))
                      : STORE_ITEMS.map((item) => item.key);
                  setStoreProductKey(options[0] ?? "");
                }}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="card">
                  {idioma === "es" ? "Carta" : "Card"}
                </option>
                <option value="item">
                  {idioma === "es" ? "Objeto" : "Item"}
                </option>
              </select>
            </label>
            <label className="block text-xs">
              {idioma === "es" ? "Producto" : "Product"}
              <select
                value={storeProductKey}
                onChange={(event) => setStoreProductKey(event.target.value)}
                className="mt-1 w-full rounded border p-2"
              >
                {storeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              {idioma === "es" ? "Rareza" : "Rarity"}
              <select
                value={storeRarity}
                onChange={(event) =>
                  setStoreRarity(event.target.value as typeof storeRarity)
                }
                className="mt-1 w-full rounded border p-2"
              >
                <option value="standard">Standard</option>
                <option value="mega">Mega</option>
                <option value="giga">Giga</option>
              </select>
            </label>
            <label className="block text-xs">
              {idioma === "es" ? "Precio en Zenys" : "Price in Zenys"}
              <input
                type="number"
                min={1}
                max={1000000}
                value={storePrice}
                onChange={(event) => setStorePrice(Number(event.target.value))}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <button
              disabled={setStoreListing.isPending || !storeProductKey}
              className="w-full rounded bg-[var(--principal)] p-2 text-sm font-bold text-white"
            >
              {idioma === "es" ? "Publicar en tienda" : "List in store"}
            </button>
          </form>
          <div className="space-y-1">
            {listedProducts.map((listing) => (
              <div
                key={listing.cardKey}
                className="flex items-center justify-between gap-2 border-t py-2 text-xs"
              >
                <span>
                  {listing.product.type === "card"
                    ? listing.product.name
                    : listing.product.name[idioma]}{" "}
                  · {listing.price} Z
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStoreListing.mutate(
                      {
                        productType: listing.productType as "card" | "item",
                        productKey: listing.productKey,
                        rarity: listing.rarity as typeof storeRarity,
                        price: listing.price,
                        listed: false,
                      },
                      {
                        onSuccess: () => void store.refetch(),
                        onError: (error) =>
                          setNotice(actionErrorMessage(error) ?? t.error),
                      },
                    )
                  }
                  className="rounded border px-2 py-1"
                >
                  {t.private}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "admin" && creator.data?.isCreator && (
        <form
          className="space-y-2 rounded border-2 border-[var(--acento)] bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            createEvent.mutate(
              {
                title: eventTitle,
                description: eventDescription,
                startsAt: new Date(eventStartsAt).toISOString(),
                endsAt: new Date(eventEndsAt).toISOString(),
                rewardType: eventRewardType,
                rewardKey: eventRewardType === "zeny" ? null : eventRewardKey,
                rewardQuantity: eventRewardQuantity,
                rewardZeny: eventRewardType === "zeny" ? eventRewardZeny : 0,
                gigaCardKeys: eventGigaCards,
              },
              {
                onSuccess: () => {
                  setNotice(
                    idioma === "es" ? "Evento publicado." : "Event published.",
                  );
                  setEventTitle("");
                  setEventDescription("");
                  void events.refetch();
                },
                onError: (error) =>
                  setNotice(actionErrorMessage(error) ?? t.error),
              },
            );
          }}
        >
          <h3 className="font-bold">
            {idioma === "es" ? "Publicar evento" : "Publish event"}
          </h3>
          <input
            required
            minLength={3}
            maxLength={64}
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
            placeholder={idioma === "es" ? "Título" : "Title"}
            className="w-full rounded border p-2 text-sm"
          />
          <textarea
            value={eventDescription}
            onChange={(event) => setEventDescription(event.target.value)}
            maxLength={240}
            placeholder={idioma === "es" ? "Descripción" : "Description"}
            className="w-full rounded border p-2 text-sm"
          />
          <label className="block text-xs">
            {idioma === "es" ? "Inicio" : "Starts"}
            <input
              required
              type="datetime-local"
              value={eventStartsAt}
              onChange={(event) => setEventStartsAt(event.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block text-xs">
            {idioma === "es" ? "Cierre" : "Ends"}
            <input
              required
              type="datetime-local"
              value={eventEndsAt}
              onChange={(event) => setEventEndsAt(event.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block text-xs">
            {idioma === "es" ? "Tipo de recompensa" : "Reward type"}
            <select
              value={eventRewardType}
              onChange={(event) =>
                setEventRewardType(event.target.value as typeof eventRewardType)
              }
              className="mt-1 w-full rounded border p-2"
            >
              <option value="card">{idioma === "es" ? "Carta" : "Card"}</option>
              <option value="item">
                {idioma === "es" ? "Objeto" : "Item"}
              </option>
              <option value="zeny">Zeny</option>
            </select>
          </label>
          {eventRewardType !== "zeny" ? (
            <label className="block text-xs">
              {idioma === "es" ? "Recompensa" : "Reward"}
              <select
                value={eventRewardKey}
                onChange={(event) => setEventRewardKey(event.target.value)}
                className="mt-1 w-full rounded border p-2"
              >
                {(eventRewardType === "card"
                  ? CARTAS.map((card) => ({
                      key: claveDeCarta(card),
                      name: card.nombre,
                    }))
                  : STORE_ITEMS.map((item) => ({
                      key: item.key,
                      name: item.name[idioma],
                    }))
                ).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-xs">
              {idioma === "es" ? "Zenys" : "Zeny"}
              <input
                type="number"
                min={1}
                max={100000}
                value={eventRewardZeny}
                onChange={(event) =>
                  setEventRewardZeny(Number(event.target.value))
                }
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          )}
          {eventRewardType !== "zeny" && (
            <label className="block text-xs">
              {idioma === "es" ? "Cantidad" : "Quantity"}
              <input
                type="number"
                min={1}
                max={100}
                value={eventRewardQuantity}
                onChange={(event) =>
                  setEventRewardQuantity(Number(event.target.value))
                }
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          )}
          <fieldset className="space-y-1">
            <legend className="text-xs font-bold">
              {idioma === "es"
                ? "Cartas GIGA autorizadas durante el evento"
                : "GIGA cards authorized during event"}
            </legend>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {CARTAS.filter((card) => card.clase === "giga").map((card) => {
                const key = claveDeCarta(card);
                return (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={eventGigaCards.includes(key)}
                      onChange={(event) =>
                        setEventGigaCards((current) =>
                          event.target.checked
                            ? [...current, key]
                            : current.filter((item) => item !== key),
                        )
                      }
                    />
                    {card.nombre}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button
            disabled={
              createEvent.isPending ||
              !eventTitle ||
              !eventStartsAt ||
              !eventEndsAt ||
              (eventRewardType !== "zeny" && !eventRewardKey)
            }
            className="w-full rounded bg-[var(--principal)] p-2 text-sm font-bold text-white"
          >
            {idioma === "es" ? "Publicar evento" : "Publish event"}
          </button>
        </form>
      )}
      {tab === "events" && (
        <div className="space-y-2 rounded border bg-white p-3">
          <h3 className="font-bold">{t.events}</h3>
          {events.data?.length ? (
            events.data.map((event) => (
              <article
                key={event.id}
                className="space-y-2 border-b pb-3 last:border-0"
              >
                <div>
                  <h4 className="font-bold">{event.title}</h4>
                  {event.description && (
                    <p className="text-sm">{event.description}</p>
                  )}
                  <p className="text-xs text-neutral-600">
                    {new Date(event.startsAt).toLocaleString()} –{" "}
                    {new Date(event.endsAt).toLocaleString()}
                  </p>
                  {event.gigaCards.length > 0 && (
                    <p className="text-xs">
                      GIGA:{" "}
                      {event.gigaCards
                        .map((entry) => entry.card?.nombre)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
                {event.claimed ? (
                  <span className="text-xs text-emerald-700">
                    {idioma === "es"
                      ? "Recompensa reclamada"
                      : "Reward claimed"}
                  </span>
                ) : (
                  event.active && (
                    <button
                      type="button"
                      disabled={claimEvent.isPending}
                      onClick={() =>
                        claimEvent.mutate(
                          { eventId: event.id },
                          {
                            onSuccess: () => {
                              setNotice(
                                idioma === "es"
                                  ? "Recompensa del evento añadida."
                                  : "Event reward added.",
                              );
                              void events.refetch();
                              void dashboard.refetch();
                            },
                            onError: (error) =>
                              setNotice(actionErrorMessage(error) ?? t.error),
                          },
                        )
                      }
                      className="rounded bg-[var(--principal)] px-3 py-2 text-xs font-bold text-white"
                    >
                      {idioma === "es" ? "Reclamar recompensa" : "Claim reward"}
                    </button>
                  )
                )}
              </article>
            ))
          ) : (
            <p className="text-sm">{t.empty}</p>
          )}
        </div>
      )}
      {tab === "zeny" && (
        <div className="space-y-3 rounded border bg-white p-3">
          <p className="text-lg font-bold">
            {t.balance}: {dashboard.data?.zenyBalance ?? 10} Z
          </p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              redeem.mutate(
                { code: redeemCode },
                {
                  onSuccess: (result) => {
                    setRedeemCode("");
                    setNotice(`${t.balance}: ${result.balance} Z`);
                  },
                  onError: (error) =>
                    setNotice(actionErrorMessage(error) ?? t.error),
                },
              );
            }}
          >
            <input
              value={redeemCode}
              onChange={(event) =>
                setRedeemCode(event.target.value.toUpperCase())
              }
              maxLength={32}
              placeholder={t.code}
              className="min-w-0 flex-1 rounded border px-2 py-2"
            />
            <button
              disabled={!redeemCode.trim() || redeem.isPending}
              className="rounded bg-[var(--principal)] px-3 py-2 font-bold text-white"
            >
              {t.redeem}
            </button>
          </form>
          {creator.data?.isCreator && (
            <div className="space-y-2 border-t pt-3">
              <h3 className="font-bold">{t.creator}</h3>
              <label className="block text-xs">
                {t.amount}
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="mt-1 w-full rounded border px-2 py-2"
                />
              </label>
              <label className="block text-xs">
                {t.count}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={codeCount}
                  onChange={(event) => setCodeCount(Number(event.target.value))}
                  className="mt-1 w-full rounded border px-2 py-2"
                />
              </label>
              <button
                type="button"
                disabled={createCodes.isPending}
                onClick={() =>
                  createCodes.mutate(
                    { amount, count: codeCount },
                    {
                      onSuccess: (result) => setCreatedCodes(result.codes),
                      onError: (error) =>
                        setNotice(actionErrorMessage(error) ?? t.error),
                    },
                  )
                }
                className="w-full rounded bg-[var(--principal)] p-2 font-bold text-white"
              >
                {t.createCodes}
              </button>
              {createdCodes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold">{t.generated}</p>
                  <textarea
                    readOnly
                    value={createdCodes.join("\n")}
                    className="h-28 w-full rounded border p-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(createdCodes.join("\n"))
                        .then(() => setNotice(t.copied))
                    }
                    className="rounded border px-3 py-2 text-sm"
                  >
                    {t.copy}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
