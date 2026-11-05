# App — Agent Guide

This starter ships as a blank Agent-Native app canvas — that describes its
initial state, not necessarily its current one. See `DEVELOPING.md` before
making any source code change.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

This repo is a single standalone app (`agent-native.scaffold.shape:
"standalone"`), not a workspace root. If the user asks for a workspace, a
platform or suite of apps, a second app, an app shell or launcher, or Dispatch,
read the `multi-app-workspace` skill before touching the repo layout.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- `navigation` describes the view and selected ids. The default home view is
  `home` at `/` (blank app canvas). No agent rail or chat is mounted by
  default; add one only when the user asks.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Building a domain app

Choose the primary workflow and route before editing. Build on the blank canvas in `app/routes/_index.tsx` or add domain routes under `app/routes/`. This starter has no Chat route, sidebar, header, or agent rail; add only the navigation the product needs. Set `app.homePath` in the existing `defineAppConfig` in `server/plugins/config.ts` as `DEVELOPING.md` describes.

Use `adding-a-feature` for functional parity and `frontend-design` for a user-facing screen. Keep feature guidance here and update `README.md` as `DEVELOPING.md` describes. After all edits, run one typecheck, one doctor check, and one browser smoke of the primary workflow and its authenticated landing. Skip production build and extra test suites.

Before building common workspace or agent UI, read `agent-native-toolkit`; for supported customization, read `customizing-agent-native`.

- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.

## Transer application

- The authenticated application is at `/`; public profiles are at `/p/:publicId`. The home route contains the Transer handheld-system experience and its internal modules.
- Durable profiles, cards, mail, connections, events, missions, inventory, and Zenny data live in `drizzle/schema.ts`; UI and agent operations belong in focused `actions/` files.
- The framework notification inbox stores categorized alerts. `get-transer-notification-count` returns the unread badge count; `get-transer-notifications` lists recent notices; `mark-transer-notification-read` takes the notification `id`. Mail, connection, mission, and event actions emit idempotent inbox-only alerts after their domain writes.
- `manage-transer-connection` accepts/rejects requests by real `requestId` and removes friends by username; its server checks scope and pending status, and agent-triggered accept/reject/removal requires approval. The DEMPA UI confirms each before calling it.
- MEGA's DEMPA handoff uses the existing AgentSidebar and `server/plugins/agent-chat.ts`; use `view-screen` to read `transer-view` for the active module/language and `notifications` for the open category or selected notice.
- Keep private records scoped to their owner in actions. Authentication and public-profile exceptions are configured in `server/plugins/auth.ts` and mirrored by the public-path check in `app/root.tsx`.
