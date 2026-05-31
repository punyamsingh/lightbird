# Plan 13 — Interactive Playground [DONE]

**Status:** Done
**Source:** Issue #55 — "Turn the web app into an interactive playground"

---

## Goal

Evolve `apps/web` from a demo + docs site into an interactive playground where a
visitor can drop a video, tweak player options live, and copy a ready-to-paste
snippet for their integration target.

## Implementation Summary

Added a new `/playground` route to the Next.js app (`apps/web`):

- **`apps/web/src/lib/playground-snippet.ts`** (new) — pure, framework-agnostic
  snippet generator. `generateSnippet(config, target)` returns `{ install, code,
  language }` for the two integration targets, matching the **real** package APIs:
  - `react` → `@lightbird/player-react`: the drop-in `<LightBirdPlayer />` (note
    capital "B") is **zero-config** — it ships its own upload UI, controls,
    subtitles, and playlist. The snippet is the import + `<Toaster />` +
    `<LightBirdPlayer />`; it deliberately invents **no** props.
  - `web-component` → `@lightbird/player`: `<lightbird-player>` reflecting the
    attributes the element actually supports (`src`, `controls`, `autoplay`,
    `muted`, `poster`). Boolean attributes are emitted only when enabled and
    values are HTML-escaped.
- **`apps/web/src/app/playground/playground.tsx`** (new) — client component with
  integration-target tabs and a live install + code panel (copy buttons):
  - **Web Component tab** — drag/drop or sample-load a video and tweak
    `controls` / `autoplay` / `muted` / `poster` live. The preview imperatively
    creates a `<lightbird-player>` (the package auto-registers on import) and
    syncs its attributes, so changes apply immediately. Local files use an object
    URL for the preview while the snippet shows a CDN placeholder.
  - **React tab** — renders the real zero-config `<LightBirdPlayer />` inside a
    `PlayerErrorBoundary`, with a note that it is self-configuring.
- **`apps/web/src/app/playground/page.tsx`** (new) — server wrapper exporting page
  metadata with a simple LIGHTBIRD header/nav (the app has no shared layout
  component).
- **`apps/web/src/lib/utils.ts`** (new) — minimal `cn` join helper (the app has no
  clsx/tailwind-merge dep; the playground never needs conflict resolution).
- **Added `@lightbird/player` as a workspace dependency** of `apps/web` so the
  Web Component preview can import it.
- **Prominent links:** "Playground" added to the landing-page header
  (`page.tsx`) and an "Open Playground" CTA in the docs hero (`docs/page.tsx`).

## Key Decisions / Corrections

- The published React component is **`LightBirdPlayer`** (capital B) from
  **`@lightbird/player-react`** and takes **no props** — so the React snippet and
  live preview use it as a zero-config drop-in rather than fabricating props.
- The Web Component supports **`src, controls, autoplay, muted, poster,
  subtitles`** (per `observedAttributes`); it does **not** support `loop`, so the
  playground does not offer it.
- The live preview and the active tab's snippet stay in agreement: tweaks on the
  Web Component tab reproduce exactly what the generated HTML produces.

## Tests

- **`apps/web/__tests__/playground-snippet.test.ts`** — covers both targets:
  install/import lines, the zero-config React output (and that it invents no
  props), Web Component attribute inclusion/omission, poster, and escaping.
- Added a minimal **`apps/web/jest.config.ts`** (ts-jest, node env) and a `test`
  script to `apps/web/package.json` so the web app participates in
  `pnpm turbo test`.

## Verification

- `turbo test` — 6/6 tasks pass (core, player-react, web-component, web).
- `turbo build --filter=web` — compiles successfully; the `/playground` route is
  generated with no regression to `/` or `/docs`.

## Acceptance Criteria — met

- [x] Playground page: drop/load a video and see it play in a live LightBird player.
- [x] Live controls toggle player config with immediate effect (Web Component).
- [x] Live-generated, copy-pasteable snippet with install command + import.
- [x] Tabs for the integration target (React + Web Component).
- [x] Client-side only — no server.
- [x] Linked prominently from the landing page and docs.
- [x] No regression to existing docs pages (verified via `next build`).
