import { describe, expect, it } from "vitest";

import {
  matchesNotificationCategory,
  notificationCategory,
} from "./notification-categories";

describe("Transer notification categories", () => {
  it("filters notices using their stored category", () => {
    const mail = { metadata: { category: "mail" } };
    expect(notificationCategory(mail)).toBe("mail");
    expect(matchesNotificationCategory(mail, "mail")).toBe(true);
    expect(matchesNotificationCategory(mail, "events")).toBe(false);
    expect(matchesNotificationCategory(mail, "all")).toBe(true);
  });

  it("keeps missing or unknown categories in the system filter", () => {
    expect(notificationCategory({})).toBe("system");
    expect(notificationCategory({ metadata: { category: "unknown" } })).toBe(
      "system",
    );
  });
});
