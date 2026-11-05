import { describe, expect, it } from "vitest";
import {
  canSendConnectionRequest,
  createIncomingConfirmation,
  toConfirmedConnectionOperation,
} from "./dempaConnectionFlow";

describe("DEMPA connection confirmation flow", () => {
  it("binds an incoming decision to the selected request and user", () => {
    const confirmation = createIncomingConfirmation("accept", {
      requestId: "request-123",
      username: "usuario_azul",
      displayName: "Usuario Azul",
    });

    expect(confirmation).toEqual({
      kind: "accept",
      requestId: "request-123",
      username: "usuario_azul",
      displayName: "Usuario Azul",
    });
    expect(toConfirmedConnectionOperation(confirmation!)).toEqual({
      operation: "accept",
      requestId: "request-123",
    });
  });

  it("does not create an accept/reject confirmation without a request id", () => {
    expect(createIncomingConfirmation("reject", {
      username: "usuario_azul",
      displayName: "Usuario Azul",
    })).toBeNull();
  });

  it("binds removal to the exact displayed username", () => {
    expect(toConfirmedConnectionOperation({
      kind: "remove",
      username: "usuario_verde",
      displayName: "Usuario Verde",
    })).toEqual({ operation: "remove-friend", username: "usuario_verde" });
  });

  it("prevents duplicate or invalid outgoing requests", () => {
    expect(canSendConnectionRequest({}, false)).toBe(true);
    expect(canSendConnectionRequest({ isFriend: true }, false)).toBe(false);
    expect(canSendConnectionRequest({ requestPending: true }, false)).toBe(false);
    expect(canSendConnectionRequest({}, true)).toBe(false);
  });
});
