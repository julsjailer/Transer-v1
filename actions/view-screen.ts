/**
 * See what the user is currently looking at on screen.
 *
 * Reads and returns the current navigation state from application state.
 *
 * Usage:
 *   pnpm action view-screen
 */

import { defineAction } from "@agent-native/core/action";
import {
  readAppState,
  readAppStateForCurrentTab,
} from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    "See what the user is currently looking at on screen. Returns the current navigation state for the app canvas plus agent rail. Always call this first before taking any action.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const bcardView = await readAppStateForCurrentTab("bcard-view");
    const transerView = await readAppStateForCurrentTab("transer-view");
    const notificationsView = await readAppStateForCurrentTab(
      "transer-notifications-view",
    );

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (bcardView) screen.bcard = bcardView;
    if (transerView) screen.transer = transerView;
    if (notificationsView) screen.notifications = notificationsView;

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
