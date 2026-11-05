export type IncomingRequestIdentity = {
  requestId?: string;
  username: string;
  displayName: string;
};

export type DempaConfirmation =
  | { kind: "accept" | "reject"; requestId: string; username: string; displayName: string }
  | { kind: "remove"; username: string; displayName: string };

export type ConfirmedConnectionOperation =
  | { operation: "accept"; requestId: string }
  | { operation: "reject"; requestId: string }
  | { operation: "remove-friend"; username: string };

export function createIncomingConfirmation(
  kind: "accept" | "reject",
  request: IncomingRequestIdentity,
): DempaConfirmation | null {
  if (!request.requestId || !request.username.trim()) return null;
  return {
    kind,
    requestId: request.requestId,
    username: request.username,
    displayName: request.displayName,
  };
}

export function toConfirmedConnectionOperation(
  confirmation: DempaConfirmation,
): ConfirmedConnectionOperation {
  if (confirmation.kind === "remove") {
    return { operation: "remove-friend", username: confirmation.username };
  }
  if (confirmation.kind === "accept") return { operation: "accept", requestId: confirmation.requestId };
  return { operation: "reject", requestId: confirmation.requestId };
}

export function canSendConnectionRequest(
  profile: { isFriend?: boolean; requestPending?: boolean },
  mutationPending: boolean,
): boolean {
  return !mutationPending && !profile.isFriend && !profile.requestPending;
}
