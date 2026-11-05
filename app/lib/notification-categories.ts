export type TranserNotificationCategory =
  | "mail"
  | "connections"
  | "rewards"
  | "events"
  | "system";

export type NotificationCategoryFilter = "all" | TranserNotificationCategory;

export const TRANSER_NOTIFICATION_CATEGORIES: TranserNotificationCategory[] = [
  "mail",
  "connections",
  "rewards",
  "events",
  "system",
];

export function notificationCategory(notification: {
  metadata?: Record<string, unknown>;
}): TranserNotificationCategory {
  const value = notification.metadata?.category;
  return TRANSER_NOTIFICATION_CATEGORIES.includes(
    value as TranserNotificationCategory,
  )
    ? (value as TranserNotificationCategory)
    : "system";
}

export function matchesNotificationCategory(
  notification: { metadata?: Record<string, unknown> },
  filter: NotificationCategoryFilter,
): boolean {
  return filter === "all" || notificationCategory(notification) === filter;
}
