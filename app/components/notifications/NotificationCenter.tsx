import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
  writeClientAppState,
} from "@agent-native/core/client/hooks";
import { IconBell, IconCheck, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatearFecha, formatearHora, type Reloj } from "@/lib/hora";
import {
  matchesNotificationCategory,
  notificationCategory,
  type NotificationCategoryFilter,
  type TranserNotificationCategory,
} from "@/lib/notification-categories";
import { reproducirSonido, SONIDO_EVENTO } from "@/lib/sonidos";
import { TAB_ID } from "@/lib/tab-id";

type Idioma = "es" | "en";
type Category = NotificationCategoryFilter;
type Notification = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

const CATEGORIES: Category[] = [
  "all",
  "mail",
  "connections",
  "rewards",
  "events",
  "system",
];
const COPY = {
  es: {
    title: "AVISOS",
    description: "Correo, conexiones y actividad de Transer.",
    open: "Abrir avisos",
    markRead: "Marcar como leído",
    empty: "No tienes avisos en esta categoría.",
    error: "No se pudieron cargar los avisos.",
    updateError: "No se pudo actualizar el aviso.",
    categories: {
      all: "Todos",
      mail: "Correo",
      connections: "Conexiones",
      rewards: "Recompensas",
      events: "Eventos",
      system: "Sistema",
    },
    unread: "sin leer",
    select: "Seleccionar",
    selected: "seleccionados",
    selectAll: "Todos",
    markSelectedRead: "Marcar leídos",
    deleteSelected: "Eliminar",
    cancelSelection: "Cancelar",
  },
  en: {
    title: "ALERTS",
    description: "Mail, connections, and Transer activity.",
    open: "Open notifications",
    markRead: "Mark as read",
    empty: "No notifications in this category.",
    error: "Notifications could not be loaded.",
    updateError: "The notification could not be updated.",
    categories: {
      all: "All",
      mail: "Mail",
      connections: "Connections",
      rewards: "Rewards",
      events: "Events",
      system: "System",
    },
    unread: "unread",
    select: "Select",
    selected: "selected",
    selectAll: "All",
    markSelectedRead: "Mark read",
    deleteSelected: "Delete",
    cancelSelection: "Cancel",
  },
} as const;

export function NotificationCenter({
  idioma,
  reloj,
  onOpenNotification,
}: {
  idioma: Idioma;
  reloj: Reloj;
  onOpenNotification: (category: TranserNotificationCategory) => void;
}) {
  const t = COPY[idioma];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const notifications = useActionQuery(
    "get-transer-notifications",
    { limit: 50 },
    {
      enabled: true,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  );
  const unread = useActionQuery(
    "get-transer-notification-count",
    {},
    {
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  );
  const markRead = useActionMutation("mark-transer-notification-read");
  const manageSelected = useActionMutation("manage-transer-notifications");
  const items = notifications.data?.notifications ?? [];
  const previousNotificationIds = useRef<Set<string> | null>(null);
  const filteredItems = useMemo(
    () => items.filter((item) => matchesNotificationCategory(item, category)),
    [items, category],
  );

  useEffect(() => {
    if (!notifications.data) return;
    const nextIds = new Set(items.map((item) => item.id));
    const newUnread = previousNotificationIds.current
      ? items.filter(
          (item) =>
            !previousNotificationIds.current?.has(item.id) && !item.readAt,
        )
      : [];
    if (newUnread.some((item) => item.metadata?.category === "mail"))
      reproducirSonido(SONIDO_EVENTO.mailNotification);
    else if (newUnread.length) reproducirSonido(SONIDO_EVENTO.notification);
    previousNotificationIds.current = nextIds;
  }, [items, notifications.data]);

  useEffect(() => {
    void writeClientAppState(
      "transer-notifications-view",
      {
        open,
        category,
        notificationId: selectedNotificationId,
      },
      { requestSource: TAB_ID },
    );
  }, [open, category, selectedNotificationId]);

  const navigateToCategory = (item: Notification) => {
    const itemCategory = item.metadata?.category;
    setSelectedNotificationId(item.id);
    setOpen(false);
    if (
      itemCategory === "mail" ||
      itemCategory === "connections" ||
      itemCategory === "rewards" ||
      itemCategory === "events" ||
      itemCategory === "system"
    ) {
      onOpenNotification(itemCategory);
    }
  };

  const openItem = (item: Notification) => {
    setNotice("");
    if (item.readAt) {
      navigateToCategory(item);
      return;
    }
    markRead.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          void notifications.refetch();
          void unread.refetch();
          navigateToCategory(item);
        },
        onError: (error) =>
          setNotice(actionErrorMessage(error) ?? t.updateError),
      },
    );
  };

  const toggleSelection = (id: string) =>
    setSelectedIds((selected) =>
      selected.includes(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id],
    );

  const runBulkAction = (operation: "read" | "delete") => {
    if (!selectedIds.length || manageSelected.isPending) return;
    setNotice("");
    manageSelected.mutate(
      { operation, ids: selectedIds },
      {
        onSuccess: () => {
          setSelectedIds([]);
          if (operation === "delete") setSelectionMode(false);
          void notifications.refetch();
          void unread.refetch();
        },
        onError: (error) =>
          setNotice(actionErrorMessage(error) ?? t.updateError),
      },
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={`${t.open}${unread.data?.unreadCount ? `, ${unread.data.unreadCount} ${t.unread}` : ""}`}
        onClick={() => {
          setSelectedNotificationId(null);
          setOpen(true);
        }}
        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border-2 border-[var(--acento)] bg-[var(--acento)] text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <IconBell size={20} aria-hidden />
        {!!unread.data?.unreadCount && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-white bg-rose-700 px-1 text-[10px] font-bold leading-4 text-white">
            {unread.data.unreadCount > 99 ? "99+" : unread.data.unreadCount}
          </span>
        )}
      </button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setSelectionMode(false);
            setSelectedIds([]);
          }
        }}
      >
        <DialogContent
          closeLabel={idioma === "es" ? "Cerrar" : "Close"}
          className="flex max-h-[85dvh] max-w-lg flex-col overflow-hidden border-4 border-[var(--marco)] bg-[var(--fondo)] p-0 text-neutral-900"
        >
          <DialogHeader className="border-b-4 border-[var(--acento)] bg-[var(--principal)] p-4 text-white">
            <DialogTitle className="font-mono tracking-[0.2em]">
              {t.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/85">
              {t.description}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <nav
              aria-label={
                idioma === "es"
                  ? "Categorías de avisos"
                  : "Notification categories"
              }
              className="grid grid-cols-3 gap-1 sm:grid-cols-6"
            >
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => {
                    setCategory(item);
                    setSelectedIds([]);
                  }}
                  className={`min-h-10 rounded-sm border-2 px-1 text-[10px] font-bold ${category === item ? "border-[var(--principal)] bg-[var(--principal)] text-white" : "border-[var(--marco)] bg-white text-neutral-900"}`}
                >
                  {t.categories[item]}
                </button>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              {selectionMode ? (
                <>
                  <span className="text-xs font-bold">
                    {selectedIds.length} {t.selected}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(filteredItems.map((item) => item.id))
                    }
                    className="min-h-10 rounded border-2 px-2 py-1 text-xs font-bold"
                  >
                    {t.selectAll}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedIds.length || manageSelected.isPending}
                    onClick={() => runBulkAction("read")}
                    className="min-h-10 rounded border-2 px-2 py-1 text-xs font-bold disabled:opacity-50"
                  >
                    {t.markSelectedRead}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedIds.length || manageSelected.isPending}
                    onClick={() => runBulkAction("delete")}
                    className="flex min-h-10 items-center gap-1 rounded border-2 px-2 py-1 text-xs font-bold disabled:opacity-50"
                  >
                    <IconTrash size={14} /> {t.deleteSelected}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedIds([]);
                    }}
                    className="ml-auto min-h-10 rounded border px-2 py-1 text-xs font-bold"
                  >
                    {t.cancelSelection}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  className="min-h-10 rounded border-2 px-2 py-1 text-xs font-bold"
                >
                  {t.select}
                </button>
              )}
            </div>
            {notice && (
              <p
                role="alert"
                className="rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800"
              >
                {notice}
              </p>
            )}
            {notifications.isLoading && (
              <p role="status" className="p-3 text-sm">
                {t.description}
              </p>
            )}
            {notifications.isError && (
              <p role="alert" className="p-3 text-sm text-rose-800">
                {t.error}
              </p>
            )}
            {!notifications.isLoading &&
              !notifications.isError &&
              filteredItems.length === 0 && (
                <p className="p-5 text-center text-sm text-neutral-600">
                  {t.empty}
                </p>
              )}
            <ul className="space-y-2">
              {filteredItems.map((item) => {
                const itemCategory = notificationCategory(item);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={
                        selectionMode
                          ? manageSelected.isPending
                          : !item.readAt && markRead.isPending
                      }
                      onClick={() =>
                        selectionMode
                          ? toggleSelection(item.id)
                          : openItem(item)
                      }
                      aria-pressed={
                        selectionMode
                          ? selectedIds.includes(item.id)
                          : undefined
                      }
                      className={`flex w-full items-start gap-3 rounded-sm border-2 border-[var(--marco)] p-3 text-left disabled:cursor-wait ${selectedIds.includes(item.id) ? "bg-[var(--tile)]" : item.readAt ? "bg-white/70" : "bg-white"}`}
                    >
                      {selectionMode ? (
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-sm border-2 ${selectedIds.includes(item.id) ? "border-[var(--principal)] bg-[var(--principal)] text-white" : "border-neutral-400 bg-white"}`}
                        >
                          {selectedIds.includes(item.id) && (
                            <IconCheck size={14} />
                          )}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`mt-1 h-3 w-3 flex-none rounded-full ${item.readAt ? "bg-neutral-300" : "bg-[var(--principal)]"}`}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <strong className="truncate text-sm">
                            {item.title}
                          </strong>
                          <span className="flex-none text-[10px] font-bold uppercase text-[var(--principal)]">
                            {t.categories[itemCategory]}
                          </span>
                        </span>
                        {item.body && (
                          <span className="mt-1 block text-xs text-neutral-700">
                            {item.body}
                          </span>
                        )}
                        <span className="mt-2 flex items-center gap-1 text-[10px] text-neutral-500">
                          <time dateTime={item.createdAt}>
                            {formatearFecha(Date.parse(item.createdAt), idioma)}{" "}
                            ·{" "}
                            {formatearHora(
                              Date.parse(item.createdAt),
                              reloj,
                              idioma,
                            )}
                          </time>
                          {!item.readAt && (
                            <>
                              <IconCheck size={12} aria-hidden />
                              <span>{t.markRead}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
