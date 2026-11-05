import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@agent-native/core/client/api-path", () => ({
  appBasePath: () => "/transer",
  appPathFromLocalRoute: (path: string) => `/transer${path}`,
}));

import { commandPathForNavigation } from "../app/hooks/use-navigation-state";

describe("commandPathForNavigation", () => {
  afterEach(() => vi.resetAllMocks());

  it("uses the authenticated home route when no path is provided", () => {
    expect(commandPathForNavigation({ view: "home" })).toBe("/");
  });

  it("preserves local paths and query suffixes", () => {
    expect(
      commandPathForNavigation({ path: "/p/public-id?tab=cards#favorites" }),
    ).toBe("/p/public-id?tab=cards#favorites");
  });

  it("converts a declared mounted public path back to its local path", () => {
    expect(
      commandPathForNavigation({
        path: "/transer/p/public-id?tab=cards#favorites",
        publicPath: "/transer/p/public-id",
      }),
    ).toBe("/p/public-id?tab=cards#favorites");
  });

  it("does not strip the app base path from an unrelated mounted path", () => {
    expect(commandPathForNavigation({ path: "/transer/settings/app" })).toBe(
      "/transer/settings/app",
    );
  });
});
