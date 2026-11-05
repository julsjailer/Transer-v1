import { notify } from "@agent-native/core/notifications";

export type TranserNotificationCategory =
  | "mail"
  | "connections"
  | "rewards"
  | "events"
  | "system";

export async function notifyTranser(
  owner: string,
  input: {
    category: TranserNotificationCategory;
    title: string;
    body?: string;
    entityId?: string;
    idempotencyKey: string;
  },
) {
  try {
    const notification = await notify(
      {
        severity: "info",
        title: input.title,
        body: input.body,
        metadata: {
          category: input.category,
          ...(input.entityId ? { entityId: input.entityId } : {}),
        },
        idempotencyKey: input.idempotencyKey,
        channels: ["inbox"],
      },
      { owner },
    );
    if (!notification)
      console.warn("[Transer] In-app notification could not be persisted.");
    return Boolean(notification);
  } catch {
    console.warn("[Transer] In-app notification could not be persisted.");
    return false;
  }
}
