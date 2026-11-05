import { writeClientAppState } from "@agent-native/core/client/hooks";
import {
  useActionMutation,
  useActionQuery,
  actionErrorMessage,
} from "@agent-native/core/client/hooks";
import IconArchive from "@tabler/icons-react/dist/esm/icons/IconArchive.mjs";
import IconBook from "@tabler/icons-react/dist/esm/icons/IconBook.mjs";
import IconCards from "@tabler/icons-react/dist/esm/icons/IconCards.mjs";
import IconCheck from "@tabler/icons-react/dist/esm/icons/IconCheck.mjs";
import IconCirclePlus from "@tabler/icons-react/dist/esm/icons/IconCirclePlus.mjs";
import IconFolder from "@tabler/icons-react/dist/esm/icons/IconFolder.mjs";
import IconFolderPlus from "@tabler/icons-react/dist/esm/icons/IconFolderPlus.mjs";
import IconGift from "@tabler/icons-react/dist/esm/icons/IconGift.mjs";
import IconHeart from "@tabler/icons-react/dist/esm/icons/IconHeart.mjs";
import IconSearch from "@tabler/icons-react/dist/esm/icons/IconSearch.mjs";
import IconSettings from "@tabler/icons-react/dist/esm/icons/IconSettings.mjs";
import IconTrash from "@tabler/icons-react/dist/esm/icons/IconTrash.mjs";
import IconX from "@tabler/icons-react/dist/esm/icons/IconX.mjs";
import { useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BCARD_FAVORITE_LIMIT, BCARD_FOLDER_LIMIT } from "@/lib/bcard-missions";
import {
  CARTAS,
  CARTA_POR_CLAVE,
  CLASES,
  ORDEN_CLASES,
  type Idioma,
} from "@/lib/cartas";
import { reproducirSonido, SONIDO_EVENTO } from "@/lib/sonidos";
import { TAB_ID } from "@/lib/tab-id";

const COPY = {
  es: {
    title: "B.Card",
    tabs: {
      owned: "Colección",
      catalog: "Catálogo",
      folders: "Carpetas",
      missions: "Misiones",
    },
    cards: "cartas",
    copies: "copias",
    search: "Buscar por nombre…",
    allClasses: "Todas las clases",
    allSeries: "Todas las series",
    allCategories: "Todas las categorías",
    myCards: "Mis cartas",
    emptyInventory:
      "Aún no tienes cartas. Abre un sobre gratuito para empezar.",
    emptyFolders: "Crea una carpeta para organizar las cartas que ya tienes.",
    noMatches: "No hay cartas que coincidan con la búsqueda.",
    newFolder: "Nueva carpeta",
    folderName: "Nombre de carpeta",
    create: "Crear",
    rename: "Renombrar",
    save: "Guardar",
    cancel: "Cancelar",
    removeFolder: "Eliminar carpeta",
    deleteTitle: "¿Eliminar esta carpeta?",
    deleteDescription:
      "Se quitarán sus cartas organizadas. Tu inventario no cambiará.",
    add: "Guardar en carpeta",
    remove: "Quitar de carpeta",
    owned: "La tienes",
    unowned: "Solo se pueden organizar cartas obtenidas",
    folderFull: "Carpeta llena · 34/34. Quita una carta o crea otra carpeta.",
    pack: "Abrir sobre gratuito",
    packReady: "Sobre disponible",
    nextPack: "Siguiente sobre",
    hourglass: "Relojes de arena",
    accelerate: "Acelerar espera",
    missionReward: "relojes de arena",
    odds: "Todas las cartas del catálogo tienen la misma probabilidad. La rareza no está definida en estos datos.",
    opening: "Abriendo…",
    packResult: "Cartas obtenidas",
    newCards: "Nuevas",
    repeats: "Repetidas",
    missions: "Misiones",
    claim: "Reclamar",
    claimed: "Reclamada",
    private: "Colección privada",
    public: "Colección pública",
    privacy: "La visibilidad pública no comparte tus carpetas.",
    favorites: "Favoritas del perfil PERSONAL",
    favoriteSlot: "Favorita",
    clear: "Quitar favorita",
    choose: "Elegir",
    limit: "6 favoritas como máximo",
    loading: "Cargando colección…",
    errors: "No se pudo completar la acción.",
  },
  en: {
    title: "B.Card",
    tabs: {
      owned: "Collection",
      catalog: "Catalog",
      folders: "Folders",
      missions: "Missions",
    },
    cards: "cards",
    copies: "copies",
    search: "Search by name…",
    allClasses: "All classes",
    allSeries: "All series",
    allCategories: "All categories",
    myCards: "My cards",
    emptyInventory:
      "You don't have cards yet. Open a free pack to get started.",
    emptyFolders: "Create a folder to organize cards you already own.",
    noMatches: "No cards match this search.",
    newFolder: "New folder",
    folderName: "Folder name",
    create: "Create",
    rename: "Rename",
    save: "Save",
    cancel: "Cancel",
    removeFolder: "Delete folder",
    deleteTitle: "Delete this folder?",
    deleteDescription:
      "Its organized cards will be removed. Your inventory will not change.",
    add: "Save to folder",
    remove: "Remove from folder",
    owned: "Owned",
    unowned: "Only obtained cards can be organized",
    folderFull: "Folder full · 34/34. Remove a card or create another folder.",
    pack: "Open free pack",
    packReady: "Pack available",
    nextPack: "Next pack",
    hourglass: "Hourglasses",
    accelerate: "Reduce cooldown",
    missionReward: "hourglasses",
    odds: "Every catalog card has equal odds. Rarity is not defined in this data.",
    opening: "Opening…",
    packResult: "Cards obtained",
    newCards: "New",
    repeats: "Duplicates",
    missions: "Missions",
    claim: "Claim",
    claimed: "Claimed",
    private: "Private collection",
    public: "Public collection",
    privacy: "Public visibility does not share your folders.",
    favorites: "PERSONAL profile favorites",
    favoriteSlot: "Favorite",
    clear: "Clear favorite",
    choose: "Choose",
    limit: "Up to 6 favorites",
    loading: "Loading collection…",
    errors: "The action could not be completed.",
  },
} as const;

type BCardTab = "owned" | "catalog" | "folders" | "missions";
const MY_CARDS_FOLDER_ID = "__transer_my_cards__";

function CardImage({ cardKey, alt }: { cardKey: string; alt: string }) {
  const card = CARTA_POR_CLAVE.get(cardKey);
  if (!card?.archivo)
    return (
      <div className="bcard-art-placeholder" aria-label={alt}>
        B.CARD
      </div>
    );
  return (
    <img
      className="bcard-art"
      src={`/cartas/${card.archivo}`}
      alt={alt}
      loading="lazy"
    />
  );
}

export function BCardColeccion({ idioma }: { idioma: Idioma }) {
  const t = COPY[idioma];
  const [tab, setTab] = useState<BCardTab>("owned");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [favoriteSlot, setFavoriteSlot] = useState<number | null>(null);
  const [openingResult, setOpeningResult] = useState<any>(null);
  const [actionError, setActionError] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());
  const [hourglassCount, setHourglassCount] = useState(1);

  const state = useActionQuery("get-bcard-dashboard", {});
  const catalog = useActionQuery("list-bcard-catalog", {
    search,
    clase: classFilter
      ? (classFilter as
          | "estandar"
          | "mega"
          | "giga"
          | "lunar"
          | "evento"
          | "bigbang")
      : undefined,
    serie: seriesFilter
      ? (seriesFilter as "Pegasus" | "Leo" | "Dragon")
      : undefined,
  });
  const createFolder = useActionMutation("manage-bcard-folder");
  const manageFolder = useActionMutation("manage-bcard-folder");
  const manageMembership = useActionMutation("manage-bcard-folder-card");
  const openPack = useActionMutation("open-bcard-pack");
  const claimMission = useActionMutation("claim-bcard-mission");
  const setFavorite = useActionMutation("set-bcard-favorite");
  const setPrivacy = useActionMutation("set-bcard-privacy");
  const useHourglasses = useActionMutation("use-bcard-hourglass");
  const data = state.data;
  const folders = data?.folders ?? [];
  const hourglassInventory =
    data?.items?.find((item) => item.itemKey === "hourglass")?.quantity ?? 0;
  const remainingMs = data?.pack.nextClaimAt
    ? Math.max(0, new Date(data.pack.nextClaimAt).getTime() - clockNow)
    : 0;
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const usefulHourglasses = Math.min(hourglassInventory, remainingHours);
  const remainingLabel = `${String(Math.floor(remainingMs / 3600000)).padStart(2, "0")}:${String(Math.floor((remainingMs % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`;
  const myCardsFolder = {
    id: MY_CARDS_FOLDER_ID,
    name: t.myCards,
    cardCount: data?.inventory.length ?? 0,
    cards: data?.inventory ?? [],
  };
  const selectedFolder =
    folderId === MY_CARDS_FOLDER_ID
      ? myCardsFolder
      : (folders.find((folder) => folder.id === folderId) ??
        folders[0] ??
        myCardsFolder);
  const isMyCardsFolder = selectedFolder?.id === MY_CARDS_FOLDER_ID;
  const ownedMap = useMemo(
    () => new Map((data?.inventory ?? []).map((card) => [card.cardKey, card])),
    [data?.inventory],
  );
  const folderKeys = useMemo(
    () => new Set(selectedFolder?.cards.map((card) => card.cardKey) ?? []),
    [selectedFolder],
  );
  const matchesCardFilters = (card: {
    nombre: string;
    clase: string;
    serie: string | null;
  }) => {
    const term = search.trim().toLocaleLowerCase();
    return (
      card.nombre.toLocaleLowerCase().includes(term) &&
      (!classFilter || card.clase === classFilter) &&
      (!seriesFilter || card.serie === seriesFilter)
    );
  };
  const ownedCards = (data?.inventory ?? []).filter(matchesCardFilters);
  const folderCards = selectedFolder?.cards.filter(matchesCardFilters) ?? [];
  const catalogCards = catalog.data ?? [];

  useEffect(() => {
    void writeClientAppState(
      "bcard-view",
      { tab, folderId: selectedFolder?.id ?? null },
      { requestSource: TAB_ID },
    );
  }, [tab, selectedFolder?.id]);
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const mutationError = (error: unknown) =>
    setActionError(actionErrorMessage(error) ?? t.errors);
  const showResult = (result: any) => {
    setOpeningResult(result);
    setActionError("");
  };

  const createFolderFromForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    createFolder.mutate(
      { operation: "create", name },
      {
        onSuccess: (folder) => {
          setFolderId(folder.id);
          setFolderName("");
          setActionError("");
        },
        onError: mutationError,
      },
    );
  };

  const renameSelectedFolder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFolder || !renameValue.trim()) return;
    manageFolder.mutate(
      {
        operation: "rename",
        folderId: selectedFolder.id,
        name: renameValue.trim(),
      },
      {
        onSuccess: () => {
          setRenaming(false);
          setActionError("");
        },
        onError: mutationError,
      },
    );
  };

  if (state.isLoading) return <div className="p-4 text-sm">{t.loading}</div>;
  if (!data)
    return (
      <div className="p-4 text-sm text-red-700">{actionError || t.errors}</div>
    );

  const tabs: BCardTab[] = ["owned", "catalog", "folders", "missions"];
  return (
    <div className="bcard-collection">
      <div className="bcard-heading">
        <div>
          <p className="bcard-kicker">TRANSER · BATTLE CARDS</p>
          <h2>{t.title}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            className="bcard-pack-button"
            disabled={!data.pack.available || openPack.isPending}
            onClick={() =>
              openPack.mutate(
                {},
                {
                  onSuccess: (result) => {
                    if (result.cards.some((card) => card.isNew))
                      reproducirSonido(SONIDO_EVENTO.cardObtained);
                    showResult(result);
                  },
                  onError: mutationError,
                },
              )
            }
          >
            <IconGift size={18} />
            {openPack.isPending
              ? t.opening
              : data.pack.available
                ? t.pack
                : `${t.nextPack}: ${remainingLabel}`}
          </button>
          <span className="text-xs">
            {t.hourglass}: {hourglassInventory}
          </span>
        </div>
      </div>
      {remainingMs > 0 && usefulHourglasses > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs">
          <label className="flex items-center gap-2">
            {t.accelerate}
            <select
              value={Math.min(hourglassCount, usefulHourglasses)}
              onChange={(event) =>
                setHourglassCount(Number(event.target.value))
              }
              className="rounded border px-2 py-1"
            >
              {Array.from({ length: usefulHourglasses }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={useHourglasses.isPending}
            onClick={() =>
              useHourglasses.mutate(
                { quantity: Math.min(hourglassCount, usefulHourglasses) },
                {
                  onSuccess: () => {
                    void state.refetch();
                    setActionError("");
                  },
                  onError: mutationError,
                },
              )
            }
            className="rounded bg-amber-700 px-2 py-1 font-bold text-white"
          >
            {useHourglasses.isPending ? t.opening : t.accelerate}
          </button>
        </div>
      )}
      <p className="bcard-pack-note">{t.odds}</p>
      <div className="bcard-summary">
        <span>
          {data.inventory.length} {t.cards}
        </span>
        <span>
          {data.inventory.reduce((sum, card) => sum + card.quantity, 0)}{" "}
          {t.copies}
        </span>
        <label>
          <input
            type="checkbox"
            checked={data.collectionPublic}
            onChange={(event) =>
              setPrivacy.mutate(
                { collectionPublic: event.target.checked },
                { onError: mutationError },
              )
            }
          />
          {data.collectionPublic ? t.public : t.private}
        </label>
      </div>
      <p className="bcard-muted">{t.privacy}</p>
      {data.collectionPublic && data.publicId && (
        <a
          className="bcard-public-link"
          href={`/p/${data.publicId}`}
          target="_blank"
          rel="noreferrer"
        >
          {idioma === "es" ? "Abrir perfil público" : "Open public profile"}{" "}
          <IconArchive size={14} />
        </a>
      )}
      <section className="bcard-favorites-panel">
        <header>
          <h3>
            <IconHeart size={17} />
            {t.favorites}
          </h3>
          <span>
            {data.favorites.length}/{BCARD_FAVORITE_LIMIT}
          </span>
        </header>
        <div className="bcard-favorites-grid">
          {Array.from({ length: BCARD_FAVORITE_LIMIT }, (_, slot) => {
            const favorite = data.favorites.find((item) => item.slot === slot);
            const card = favorite
              ? CARTA_POR_CLAVE.get(favorite.cardKey)
              : null;
            return (
              <button
                type="button"
                key={slot}
                className="bcard-favorite-slot"
                onClick={() => setFavoriteSlot(slot)}
              >
                {card ? (
                  <>
                    <CardImage cardKey={favorite!.cardKey} alt={card.nombre} />
                    <span>{card.nombre}</span>
                  </>
                ) : (
                  <>
                    <IconCirclePlus size={18} />
                    <span>{t.choose}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <div className="bcard-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            role="tab"
            aria-selected={tab === item}
            className={
              tab === item ? "bcard-tab bcard-tab-active" : "bcard-tab"
            }
            onClick={() => setTab(item)}
          >
            {item === "owned" ? (
              <IconCards size={16} />
            ) : item === "catalog" ? (
              <IconBook size={16} />
            ) : item === "folders" ? (
              <IconFolder size={16} />
            ) : (
              <IconGift size={16} />
            )}
            {t.tabs[item]}
          </button>
        ))}
      </div>
      {actionError && (
        <p role="alert" className="bcard-error">
          {actionError}
        </p>
      )}

      {tab === "owned" && (
        <>
          <div className="bcard-toolbar">
            <label className="bcard-search">
              <IconSearch size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
              />
            </label>
            <select
              aria-label={t.allClasses}
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="">{t.allClasses}</option>
              {ORDEN_CLASES.map((clase) => (
                <option key={clase} value={clase}>
                  {CLASES[clase][idioma]}
                </option>
              ))}
            </select>
            <select
              aria-label={t.allSeries}
              value={seriesFilter}
              onChange={(event) => setSeriesFilter(event.target.value)}
            >
              <option value="">{t.allSeries}</option>
              {["Pegasus", "Leo", "Dragon"].map((serie) => (
                <option key={serie}>{serie}</option>
              ))}
            </select>
            <span>
              {ownedCards.length} {t.cards}
            </span>
          </div>
          {ownedCards.length ? (
            <div className="bcard-grid">
              {ownedCards.map((card) => (
                <article className="bcard-item" key={card.cardKey}>
                  <div className="bcard-art-wrap">
                    <CardImage cardKey={card.cardKey} alt={card.nombre} />
                    <span className="bcard-quantity">×{card.quantity}</span>
                  </div>
                  <h3>{card.nombre}</h3>
                  <p>
                    {CLASES[card.clase][idioma]}
                    {card.serie ? ` · ${card.serie}` : ""}
                  </p>
                  <p className="bcard-effect">{card.efecto[idioma]}</p>
                  <button
                    type="button"
                    className="bcard-secondary"
                    onClick={() => {
                      setTab("folders");
                      setFolderId(folders[0]?.id ?? MY_CARDS_FOLDER_ID);
                      setSearch("");
                    }}
                  >
                    {t.add}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="bcard-empty">{t.emptyInventory}</p>
          )}
        </>
      )}

      {tab === "catalog" && (
        <>
          <div className="bcard-toolbar">
            <label className="bcard-search">
              <IconSearch size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
              />
            </label>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="">{t.allClasses}</option>
              {ORDEN_CLASES.map((clase) => (
                <option key={clase} value={clase}>
                  {CLASES[clase][idioma]}
                </option>
              ))}
            </select>
            <select
              value={seriesFilter}
              onChange={(event) => setSeriesFilter(event.target.value)}
            >
              <option value="">{t.allSeries}</option>
              {["Pegasus", "Leo", "Dragon"].map((serie) => (
                <option key={serie}>{serie}</option>
              ))}
            </select>
          </div>
          {catalogCards.length ? (
            <div className="bcard-grid">
              {catalogCards.map((card) => {
                const cardKey = `${card.clase}-${card.serie ?? ""}-${card.nombre}`;
                const owned = ownedMap.has(cardKey);
                return (
                  <article className="bcard-item" key={cardKey}>
                    <div className="bcard-art-wrap">
                      <CardImage cardKey={cardKey} alt={card.nombre} />
                      {owned && (
                        <span className="bcard-quantity">
                          ×{ownedMap.get(cardKey)?.quantity}
                        </span>
                      )}
                    </div>
                    <h3>{card.nombre}</h3>
                    <p>
                      {CLASES[card.clase][idioma]}
                      {card.serie ? ` · ${card.serie}` : ""}
                    </p>
                    <p className="bcard-effect">{card.efecto[idioma]}</p>
                    <span className={owned ? "bcard-owned" : "bcard-unowned"}>
                      {owned ? t.owned : t.unowned}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="bcard-empty">{t.noMatches}</p>
          )}
        </>
      )}

      {tab === "folders" && (
        <>
          <div className="bcard-folder-layout">
            <aside className="bcard-folder-list">
              <button
                type="button"
                className={
                  isMyCardsFolder
                    ? "bcard-folder bcard-folder-active"
                    : "bcard-folder"
                }
                onClick={() => {
                  setFolderId(MY_CARDS_FOLDER_ID);
                  setRenaming(false);
                }}
              >
                {t.myCards}
                <span>{data.inventory.length}</span>
              </button>
              <form
                onSubmit={createFolderFromForm}
                className="bcard-create-folder"
              >
                <input
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  maxLength={32}
                  placeholder={t.folderName}
                  aria-label={t.folderName}
                />
                <button
                  type="submit"
                  disabled={createFolder.isPending || !folderName.trim()}
                  aria-label={t.newFolder}
                >
                  <IconFolderPlus size={17} />
                </button>
              </form>
              {folders.map((folder) => (
                <button
                  type="button"
                  key={folder.id}
                  className={
                    selectedFolder?.id === folder.id
                      ? "bcard-folder bcard-folder-active"
                      : "bcard-folder"
                  }
                  onClick={() => {
                    setFolderId(folder.id);
                    setRenaming(false);
                  }}
                >
                  {folder.name}
                  <span>
                    {folder.cardCount}/{BCARD_FOLDER_LIMIT}
                  </span>
                </button>
              ))}
            </aside>
            {selectedFolder && (
              <section className="bcard-folder-content">
                <header>
                  <div>
                    <h3>
                      <IconFolder size={17} />
                      {selectedFolder.name}
                    </h3>
                    <span>
                      {isMyCardsFolder
                        ? selectedFolder.cardCount
                        : `${selectedFolder.cardCount}/${BCARD_FOLDER_LIMIT}`}
                    </span>
                  </div>
                  {!isMyCardsFolder && (
                    <div className="bcard-folder-actions">
                      <button
                        type="button"
                        aria-label={t.rename}
                        onClick={() => {
                          setRenameValue(selectedFolder.name);
                          setRenaming((value) => !value);
                        }}
                      >
                        <IconSettings size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={t.removeFolder}
                        onClick={() => setDeleteFolderId(selectedFolder.id)}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )}
                </header>
                {!isMyCardsFolder && renaming && (
                  <form
                    className="bcard-create-folder"
                    onSubmit={renameSelectedFolder}
                  >
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      maxLength={32}
                      aria-label={t.rename}
                    />
                    <button
                      type="submit"
                      disabled={manageFolder.isPending || !renameValue.trim()}
                    >
                      {t.save}
                    </button>
                  </form>
                )}
                {!isMyCardsFolder &&
                  selectedFolder.cardCount >= BCARD_FOLDER_LIMIT && (
                    <p className="bcard-error">{t.folderFull}</p>
                  )}
                <div className="bcard-toolbar">
                  <label className="bcard-search">
                    <IconSearch size={16} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t.search}
                    />
                  </label>
                  <select
                    aria-label={t.allClasses}
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                  >
                    <option value="">{t.allClasses}</option>
                    {ORDEN_CLASES.map((clase) => (
                      <option key={clase} value={clase}>
                        {CLASES[clase][idioma]}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t.allSeries}
                    value={seriesFilter}
                    onChange={(event) => setSeriesFilter(event.target.value)}
                  >
                    <option value="">{t.allSeries}</option>
                    {["Pegasus", "Leo", "Dragon"].map((serie) => (
                      <option key={serie}>{serie}</option>
                    ))}
                  </select>
                  <span>
                    {folderCards.length} {t.cards}
                  </span>
                </div>
                {folderCards.length ? (
                  <div className="bcard-grid">
                    {folderCards.map((card) => (
                      <article className="bcard-item" key={card.cardKey}>
                        <div className="bcard-art-wrap">
                          <CardImage cardKey={card.cardKey} alt={card.nombre} />
                          <span className="bcard-quantity">
                            ×{card.quantity}
                          </span>
                        </div>
                        <h3>{card.nombre}</h3>
                        {!isMyCardsFolder && (
                          <button
                            type="button"
                            className="bcard-secondary"
                            onClick={() =>
                              manageMembership.mutate(
                                {
                                  operation: "remove",
                                  folderId: selectedFolder.id,
                                  cardKey: card.cardKey,
                                },
                                { onError: mutationError },
                              )
                            }
                          >
                            <IconX size={15} />
                            {t.remove}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="bcard-empty">
                    {selectedFolder.cards.length ? t.noMatches : t.emptyFolders}
                  </p>
                )}
                {!isMyCardsFolder && data.inventory.length > 0 && (
                  <div className="bcard-owned-strip">
                    <h4>{t.add}</h4>
                    {data.inventory.filter(matchesCardFilters).map((card) => (
                      <button
                        type="button"
                        key={card.cardKey}
                        disabled={
                          folderKeys.has(card.cardKey) ||
                          selectedFolder.cardCount >= BCARD_FOLDER_LIMIT ||
                          manageMembership.isPending
                        }
                        onClick={() =>
                          manageMembership.mutate(
                            {
                              operation: "add",
                              folderId: selectedFolder.id,
                              cardKey: card.cardKey,
                            },
                            {
                              onSuccess: () => void state.refetch(),
                              onError: mutationError,
                            },
                          )
                        }
                      >
                        <IconCirclePlus size={15} />
                        {card.nombre}
                        <span>×{card.quantity}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          <AlertDialog
            open={deleteFolderId !== null}
            onOpenChange={(open) => {
              if (!open) setDeleteFolderId(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.deleteDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!deleteFolderId) return;
                    manageFolder.mutate(
                      { operation: "delete", folderId: deleteFolderId },
                      {
                        onSuccess: () => {
                          setDeleteFolderId(null);
                          setFolderId("");
                        },
                        onError: mutationError,
                      },
                    );
                  }}
                >
                  {t.removeFolder}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {tab === "missions" && (
        <div className="bcard-missions">
          {data.missions.map((mission) => (
            <article className="bcard-mission" key={mission.key}>
              <div>
                <h3>{mission.title[idioma]}</h3>
                <p>{mission.description[idioma]}</p>
                <div className="bcard-progress">
                  <span
                    style={{
                      width: `${Math.min(100, (mission.progress / mission.target) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {mission.progress}/{mission.target} · +{mission.rewardCards}{" "}
                  {t.cards} · +{mission.rewardHourglasses} {t.missionReward}
                </small>
              </div>
              <button
                type="button"
                disabled={
                  !mission.completed ||
                  mission.claimed ||
                  claimMission.isPending
                }
                onClick={() =>
                  claimMission.mutate(
                    { missionKey: mission.key },
                    {
                      onSuccess: (result) => {
                        if (result.level > data.progression.level)
                          reproducirSonido(SONIDO_EVENTO.levelUp);
                        showResult(result);
                      },
                      onError: mutationError,
                    },
                  )
                }
              >
                {mission.claimed ? (
                  <>
                    <IconCheck size={15} />
                    {t.claimed}
                  </>
                ) : (
                  t.claim
                )}
              </button>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={favoriteSlot !== null}
        onOpenChange={(open) => {
          if (!open) setFavoriteSlot(null);
        }}
      >
        <DialogContent className="bcard-picker-dialog">
          <DialogHeader>
            <DialogTitle>
              {t.favoriteSlot} {favoriteSlot === null ? "" : favoriteSlot + 1}
            </DialogTitle>
            <DialogDescription>{t.limit}</DialogDescription>
          </DialogHeader>
          <div className="bcard-favorite-options">
            {data.inventory.map((card) => {
              const selectedAt = data.favorites.find(
                (favorite) => favorite.cardKey === card.cardKey,
              );
              return (
                <button
                  type="button"
                  key={card.cardKey}
                  disabled={
                    (selectedAt !== undefined &&
                      selectedAt.slot !== favoriteSlot) ||
                    setFavorite.isPending
                  }
                  onClick={() =>
                    favoriteSlot !== null &&
                    setFavorite.mutate(
                      { slot: favoriteSlot, cardKey: card.cardKey },
                      {
                        onSuccess: () => {
                          setFavoriteSlot(null);
                          setActionError("");
                        },
                        onError: mutationError,
                      },
                    )
                  }
                >
                  <CardImage cardKey={card.cardKey} alt={card.nombre} />
                  <span>
                    {card.nombre} ×{card.quantity}
                  </span>
                  {selectedAt?.slot === favoriteSlot && <IconHeart size={15} />}
                </button>
              );
            })}
          </div>
          {favoriteSlot !== null &&
            data.favorites.some(
              (favorite) => favorite.slot === favoriteSlot,
            ) && (
              <button
                type="button"
                className="bcard-secondary"
                onClick={() =>
                  setFavorite.mutate(
                    { slot: favoriteSlot, cardKey: null },
                    {
                      onSuccess: () => setFavoriteSlot(null),
                      onError: mutationError,
                    },
                  )
                }
              >
                {t.clear}
              </button>
            )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openingResult !== null}
        onOpenChange={(open) => {
          if (!open) setOpeningResult(null);
        }}
      >
        <DialogContent className="bcard-reveal">
          <DialogHeader>
            <DialogTitle>
              {openingResult?.items ? t.missions : t.packResult}
            </DialogTitle>
            <DialogDescription>
              {openingResult?.items
                ? `${openingResult.items[0]?.quantity ?? 0} ${t.hourglass}`
                : idioma === "es"
                  ? "El sobre se añadió a tu colección."
                  : "The pack was added to your collection."}
            </DialogDescription>
          </DialogHeader>
          {openingResult?.cards && (
            <div className="bcard-reveal-grid">
              {openingResult.cards.map(
                (card: {
                  cardKey: string;
                  quantity: number;
                  isNew: boolean;
                }) => {
                  const info = CARTA_POR_CLAVE.get(card.cardKey);
                  if (!info) return null;
                  return (
                    <article key={card.cardKey} className="bcard-reveal-card">
                      <CardImage cardKey={card.cardKey} alt={info.nombre} />
                      <strong>{info.nombre}</strong>
                      <span>×{card.quantity}</span>
                      <small>{card.isNew ? t.newCards : t.repeats}</small>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
