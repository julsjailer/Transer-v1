import { useState } from "react";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import type { Idioma } from "@/lib/cartas";

type Category = "search" | "friends" | "followers" | "following" | "requests";
type Connection = { username: string; displayName: string; avatarData: string | null; level: number; isBrother?: boolean };

const COPY = {
  es: { title: "CONECTAR", search: "Buscar por username o nombre…", searchTab: "Buscar", friends: "Amigos", followers: "Seguidores", following: "Siguiendo", requests: "Solicitudes", add: "Agregar amigo", pending: "Pendiente", follow: "Seguir", unfollow: "Dejar de seguir", remove: "Eliminar amigo", brother: "Vincular como hermano", unbrother: "Quitar vínculo de hermano", accept: "Aceptar", reject: "Rechazar", empty: "No hay usuarios en esta lista.", limit: "Máximo 6 hermanos activos.", error: "No se pudo completar la acción." },
  en: { title: "CONNECT", search: "Search by username or name…", searchTab: "Search", friends: "Friends", followers: "Followers", following: "Following", requests: "Requests", add: "Add friend", pending: "Pending", follow: "Follow", unfollow: "Unfollow", remove: "Remove friend", brother: "Link as brother", unbrother: "Remove brother link", accept: "Accept", reject: "Reject", empty: "No users in this list.", limit: "Up to 6 active brothers.", error: "The action could not be completed." },
} as const;

export function PanelConectar({ idioma }: { idioma: Idioma }) {
  const t = COPY[idioma];
  const [category, setCategory] = useState<Category>("search");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const connections = useActionQuery("get-transer-connections", { query });
  const manage = useActionMutation("manage-transer-connection");
  const data = connections.data;
  const run = (input: Parameters<typeof manage.mutate>[0]) => manage.mutate(input, {
    onSuccess: () => { setNotice(""); void connections.refetch(); },
    onError: (error) => setNotice(actionErrorMessage(error) ?? t.error),
  });
  const tabs: Category[] = ["search", "friends", "followers", "following", "requests"];
  const directory: Connection[] = category === "friends" ? data?.friends ?? [] : category === "followers" ? data?.followers ?? [] : data?.following ?? [];

  return <section className="space-y-3 rounded border bg-white p-3 text-neutral-900">
    <header className="flex items-start justify-between gap-2"><div><h2 className="font-bold">{t.title}</h2><p className="text-xs text-neutral-600">{t.limit} · {data?.friends.filter((friend) => friend.isBrother).length ?? 0}/6</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="min-w-0 flex-1 rounded border px-2 py-2 text-xs" /></header>
    <nav className="grid grid-cols-2 gap-1 sm:grid-cols-5">{tabs.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded border px-2 py-2 text-xs font-bold ${category === item ? "bg-[var(--principal)] text-white" : "bg-white"}`}>{t[item]}</button>)}</nav>
    {notice && <p role="status" className="rounded bg-rose-50 p-2 text-xs text-rose-800">{notice}</p>}
    {category === "search" && <div className="space-y-2">{(data?.results ?? []).map((user) => <article key={user.username} className="flex items-center gap-2 rounded border p-2"><img src={user.avatarData ?? ""} alt="" className="h-10 w-10 rounded-full bg-neutral-200 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.displayName}</p><p className="text-xs text-neutral-600">@{user.username} · NV {user.level}</p></div><button type="button" disabled={user.isFriend || user.requestPending || manage.isPending} onClick={() => run({ operation: "request", username: user.username })} className="rounded border px-2 py-1 text-xs">{user.isFriend ? t.friends : user.requestPending ? t.pending : t.add}</button><button type="button" disabled={user.follows || manage.isPending} onClick={() => run({ operation: "follow", username: user.username })} className="rounded border px-2 py-1 text-xs">{user.follows ? t.following : t.follow}</button></article>)}{query && !data?.results.length && <p className="text-sm text-neutral-500">{t.empty}</p>}</div>}
    {category === "requests" && <div className="space-y-2">{(data?.incoming ?? []).map((user) => <article key={user.requestId} className="flex items-center gap-2 rounded border p-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{user.displayName}</p><p className="text-xs">@{user.username}</p></div><button type="button" disabled={manage.isPending} onClick={() => run({ operation: "accept", requestId: user.requestId })} className="rounded bg-[var(--principal)] px-2 py-1 text-xs font-bold text-white">{t.accept}</button><button type="button" disabled={manage.isPending} onClick={() => run({ operation: "reject", requestId: user.requestId })} className="rounded border px-2 py-1 text-xs">{t.reject}</button></article>)}{!data?.incoming.length && <p className="text-sm text-neutral-500">{t.empty}</p>}</div>}
    {category !== "search" && category !== "requests" && <div className="space-y-2">{directory.map((user) => <article key={user.username} className="flex items-center gap-2 rounded border p-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{user.displayName}</p><p className="text-xs text-neutral-600">@{user.username} · NV {user.level}</p></div>{category === "friends" && <><button type="button" disabled={manage.isPending} onClick={() => run({ operation: "set-brother", username: user.username, enabled: !user.isBrother })} className="rounded border px-2 py-1 text-xs">{user.isBrother ? t.unbrother : t.brother}</button><button type="button" disabled={manage.isPending} onClick={() => run({ operation: "remove-friend", username: user.username })} className="rounded border px-2 py-1 text-xs">{t.remove}</button></>}{category === "following" && <button type="button" disabled={manage.isPending} onClick={() => run({ operation: "unfollow", username: user.username })} className="rounded border px-2 py-1 text-xs">{t.unfollow}</button>}</article>)}{!directory.length && <p className="text-sm text-neutral-500">{t.empty}</p>}</div>}
  </section>;
}
