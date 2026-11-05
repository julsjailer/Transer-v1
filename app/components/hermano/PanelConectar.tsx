import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";

import type { Idioma } from "@/lib/cartas";
import { reproducirSonido, SONIDO_EVENTO } from "@/lib/sonidos";

const COPY = {
  es: {
    title: "CONECTAR",
    search: "Buscar",
    filters: "Filtros",
    following: "Siguiendo",
    followers: "Seguidores",
    friends: "Amigos",
    brothers: "Hermanos · Banda-Hermano",
    connections: "Conexiones",
    all: "Todos",
    incoming: "Solicitudes recibidas",
    accept: "Aceptar amistad",
    acceptBrother: "Aceptar y añadir a Banda-Hermano",
    reject: "Rechazar",
    searchPlaceholder: "Buscar por nombre o usuario…",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    add: "Agregar amigo",
    pending: "Solicitud pendiente",
    profile: "Ver perfil",
    secret: "Secreto compartido",
    secretDenied:
      "Debes formar parte de su Banda-Hermano para ver su Secreto Compartido.",
    noSecret: "Aún no hay un secreto compartido.",
    loading: "Cargando…",
    emptySearch: "Escribe un nombre o usuario para buscar.",
    emptyResults: "No se encontraron perfiles.",
    emptyList: "No hay perfiles en esta categoría.",
    privateFavorites: "Esta colección es privada.",
    error: "No se pudo completar la acción.",
    retry: "Reintentar",
    back: "Volver a resultados",
  },
  en: {
    title: "CONNECT",
    search: "Search",
    filters: "Filters",
    following: "Following",
    followers: "Followers",
    friends: "Friends",
    brothers: "Brothers · Brother Band",
    connections: "Connections",
    all: "Everyone",
    incoming: "Incoming requests",
    accept: "Accept friend",
    acceptBrother: "Accept and add to Brother Band",
    reject: "Decline",
    searchPlaceholder: "Search by name or username…",
    follow: "Follow",
    unfollow: "Unfollow",
    add: "Add friend",
    pending: "Request pending",
    profile: "View profile",
    secret: "Shared secret",
    secretDenied:
      "You must be part of their Brother Band to view their Shared Secret.",
    noSecret: "No shared secret yet.",
    loading: "Loading…",
    emptySearch: "Enter a name or username to search.",
    emptyResults: "No profiles found.",
    emptyList: "No profiles in this category.",
    privateFavorites: "This collection is private.",
    error: "The action could not be completed.",
    retry: "Retry",
    back: "Back to results",
  },
} as const;

type Section =
  | "all"
  | "following"
  | "followers"
  | "friends"
  | "brothers"
  | "connections";

export function PanelConectar({ idioma }: { idioma: Idioma }) {
  const t = COPY[idioma];
  const [section, setSection] = useState<Section>("following");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [notice, setNotice] = useState("");
  const connections = useActionQuery("get-transer-connections", {
    query: query.trim(),
    all: section === "all" || Boolean(query.trim()),
  });
  const manage = useActionMutation("manage-transer-connection");
  const profiles = connections.data?.results ?? [];
  const following = connections.data?.following ?? [];
  const followers = connections.data?.followers ?? [];
  const friends = connections.data?.friends ?? [];
  const brothers = friends.filter((profile) => profile.isBrother);
  const connectionMap = new Map(
    [...following, ...followers, ...friends].map((profile) => [
      profile.username,
      profile,
    ]),
  );
  const incoming = connections.data?.incoming ?? [];
  const lists = {
    following,
    followers,
    friends,
    brothers,
    connections: [...connectionMap.values()],
  };
  const visibleSource =
    query.trim() || section === "all" ? profiles : lists[section];
  const visibleProfiles = visibleSource.map((profile) => ({
    ...profile,
    follows: Boolean(
      ("follows" in profile && profile.follows) ||
      following.some((entry) => entry.username === profile.username),
    ),
  }));
  const selectedProfile = [...profiles, ...visibleProfiles, ...incoming].find(
    (profile) => profile.username === selectedUsername,
  );
  const selectedProfileAccess = selectedProfile as
    | { isBrother?: boolean; secretDescription?: string }
    | undefined;

  const toggleFollow = (username: string, isFollowing: boolean) => {
    if (manage.isPending) return;
    setNotice("");
    manage.mutate(
      { operation: isFollowing ? "unfollow" : "follow", username },
      {
        onSuccess: () => void connections.refetch(),
        onError: (error) => setNotice(actionErrorMessage(error) ?? t.error),
      },
    );
  };

  const requestFriend = (username: string) => {
    if (manage.isPending) return;
    setNotice("");
    manage.mutate(
      { operation: "request", username },
      {
        onSuccess: () => void connections.refetch(),
        onError: (error) => setNotice(actionErrorMessage(error) ?? t.error),
      },
    );
  };

  const respondToRequest = (
    requestId: string,
    operation: "accept" | "accept-as-brother" | "reject",
  ) => {
    if (manage.isPending) return;
    setNotice("");
    manage.mutate(
      { operation, requestId },
      {
        onSuccess: () => void connections.refetch(),
        onError: (error) => setNotice(actionErrorMessage(error) ?? t.error),
      },
    );
  };

  const filterNames: Record<Section, string> = {
    all: t.all,
    following: t.following,
    followers: t.followers,
    friends: t.friends,
    brothers: t.brothers,
    connections: t.connections,
  };

  return (
    <section className="space-y-3 rounded border bg-white p-3 text-neutral-900 sm:p-4">
      <header>
        <h2 className="font-bold">{t.title}</h2>
      </header>
      {selectedProfile ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              reproducirSonido(SONIDO_EVENTO.back);
              setSelectedUsername(null);
              setShowSecret(false);
            }}
            className="min-h-10 rounded border px-3 py-2 text-sm font-bold"
          >
            ‹ {t.back}
          </button>
          <article className="space-y-3 rounded border p-3">
            <div className="flex items-center gap-3">
              {selectedProfile.avatarData ? (
                <img
                  src={selectedProfile.avatarData}
                  alt=""
                  className="h-16 w-16 flex-none rounded border object-contain"
                />
              ) : (
                <span className="grid h-16 w-16 flex-none place-items-center rounded border bg-neutral-100 text-xl font-bold">
                  {selectedProfile.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="truncate font-bold">
                  {selectedProfile.displayName}
                </h3>
                <p className="truncate text-sm text-neutral-600">
                  @{selectedProfile.username}
                </p>
                <p className="text-xs">NV {selectedProfile.level}</p>
              </div>
            </div>
            {selectedProfile.description && (
              <p className="whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-sm">
                {selectedProfile.description}
              </p>
            )}
            <section className="space-y-2">
              <h4 className="text-sm font-bold">
                {t.friends} ·{" "}
                {idioma === "es" ? "Cartas favoritas" : "Favorite cards"}
              </h4>
              {selectedProfile.collectionPublic ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }, (_, slot) => {
                    const card = selectedProfile.favorites?.find(
                      (favorite) => favorite.slot === slot,
                    );
                    return (
                      <div
                        key={slot}
                        className="min-w-0 rounded border p-1 text-center"
                      >
                        {card?.archivo ? (
                          <img
                            src={`/cartas/${card.archivo}`}
                            alt={card.nombre}
                            className="aspect-[4/3] w-full object-contain"
                          />
                        ) : (
                          <div className="grid aspect-[4/3] place-items-center bg-neutral-50 text-xs text-neutral-400">
                            —
                          </div>
                        )}
                        {card && (
                          <p className="truncate text-[10px] font-bold">
                            {card.nombre}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">{t.privateFavorites}</p>
              )}
            </section>
            <section className="space-y-2 border-t pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedProfileAccess?.isBrother)
                    reproducirSonido(SONIDO_EVENTO.denied);
                  setShowSecret((value) => !value);
                }}
                className="min-h-10 rounded border px-3 py-2 text-sm font-bold"
              >
                {t.secret}
              </button>
              {showSecret && (
                <p
                  role="status"
                  className="whitespace-pre-wrap break-words rounded bg-fuchsia-50 p-2 text-sm"
                >
                  {selectedProfileAccess?.isBrother
                    ? selectedProfileAccess.secretDescription || t.noSecret
                    : t.secretDenied}
                </p>
              )}
            </section>
          </article>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="sr-only">{t.search}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
              className="min-h-10 rounded border px-3 py-2 text-sm font-bold"
            >
              {t.filters}: {filterNames[section]} ▾
            </button>
            {filtersOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 grid w-full grid-cols-2 gap-1 rounded border bg-white p-2 shadow-lg sm:grid-cols-3">
                {(Object.keys(filterNames) as Section[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={section === item}
                    onClick={() => {
                      setSection(item);
                      setFiltersOpen(false);
                    }}
                    className={`min-h-10 rounded border px-2 py-2 text-xs font-bold ${section === item ? "bg-[var(--principal)] text-white" : "bg-white"}`}
                  >
                    {filterNames[item]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {notice && (
            <p
              role="alert"
              className="rounded bg-rose-50 p-2 text-sm text-rose-800"
            >
              {notice}
            </p>
          )}
          {incoming.length > 0 && (
            <section className="space-y-2 rounded border bg-fuchsia-50 p-2">
              <h3 className="text-sm font-bold">{t.incoming}</h3>
              <ul className="space-y-2">
                {incoming.map((request) => (
                  <li
                    key={request.requestId}
                    className="space-y-2 rounded border bg-white p-2"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedUsername(request.username)}
                      className="min-h-10 text-left text-sm font-bold"
                    >
                      {request.displayName} · @{request.username}
                    </button>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={manage.isPending}
                        onClick={() =>
                          respondToRequest(
                            request.requestId,
                            "accept-as-brother",
                          )
                        }
                        className="min-h-10 rounded border border-fuchsia-700 px-2 py-2 text-xs font-bold text-fuchsia-900 disabled:opacity-50"
                      >
                        {t.acceptBrother}
                      </button>
                      <button
                        type="button"
                        disabled={manage.isPending}
                        onClick={() =>
                          respondToRequest(request.requestId, "accept")
                        }
                        className="min-h-10 rounded border px-2 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {t.accept}
                      </button>
                      <button
                        type="button"
                        disabled={manage.isPending}
                        onClick={() =>
                          respondToRequest(request.requestId, "reject")
                        }
                        className="min-h-10 rounded border px-2 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {t.reject}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {connections.isLoading ? (
            <p role="status" className="py-2 text-sm text-neutral-600">
              {t.loading}
            </p>
          ) : connections.isError ? (
            <div className="flex items-center justify-between gap-2 rounded bg-rose-50 p-3 text-sm text-rose-800">
              <span>{t.error}</span>
              <button
                type="button"
                onClick={() => void connections.refetch()}
                className="rounded border px-3 py-2 font-semibold"
              >
                {t.retry}
              </button>
            </div>
          ) : visibleProfiles.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {query.trim() ? t.emptyResults : t.emptyList}
            </p>
          ) : (
            <ProfileList
              profiles={visibleProfiles}
              idioma={idioma}
              t={t}
              isPending={manage.isPending}
              onView={(profile) => setSelectedUsername(profile.username)}
              onFollow={toggleFollow}
              onRequest={requestFriend}
            />
          )}
        </>
      )}
    </section>
  );
}

function ProfileList({
  profiles,
  idioma,
  t,
  isPending,
  onView,
  onFollow,
  onRequest,
}: {
  profiles: Array<{
    username: string;
    displayName: string;
    avatarData: string | null;
    level: number;
    follows?: boolean;
    isFriend?: boolean;
    isBrother?: boolean;
    requestPending?: boolean;
  }>;
  idioma: Idioma;
  t: (typeof COPY)[Idioma];
  isPending: boolean;
  onView: (profile: { username: string }) => void;
  onFollow: (username: string, isFollowing: boolean) => void;
  onRequest: (username: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {profiles.map((profile) => (
        <li
          key={profile.username}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <button
            type="button"
            onClick={() => onView(profile)}
            className="flex min-w-0 items-center gap-3 rounded px-1 py-1 text-left hover:bg-neutral-50"
          >
            {profile.avatarData ? (
              <img
                src={profile.avatarData}
                alt=""
                className="h-11 w-11 flex-none rounded-full bg-neutral-100 object-contain"
              />
            ) : (
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-neutral-100 font-bold">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {profile.displayName}
              </span>
              <span className="block truncate text-xs text-neutral-600">
                @{profile.username} · NV {profile.level}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onFollow(profile.username, Boolean(profile.follows))}
            className="min-h-10 rounded border px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            {profile.follows ? t.unfollow : t.follow}
          </button>
          {!profile.isFriend && (
            <button
              type="button"
              disabled={isPending || profile.requestPending}
              onClick={() => onRequest(profile.username)}
              className="col-span-2 min-h-10 rounded border border-fuchsia-700 px-3 py-2 text-xs font-bold text-fuchsia-900 disabled:opacity-50 sm:col-span-1"
            >
              {profile.requestPending ? t.pending : t.add}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
