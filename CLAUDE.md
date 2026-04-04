# LightBird — Development Guide for Claude

## Project Summary

LightBird is a modern, lightweight video player built as a **pnpm monorepo** with **Next.js 15** and **React 18**. It publishes two npm packages (`lightbird` and `@lightbird/ui`) while keeping the web app at lightbird.vercel.app fully functional.

**Tech stack:** pnpm workspaces, Turborepo, tsup, Next.js 15, React 18, TypeScript, Tailwind CSS, ShadCN UI (Radix UI), FFmpeg.wasm.

**Monorepo structure:**
- `packages/lightbird/` — Framework-agnostic core: players, parsers, subtitle pipeline, utilities, types
- `packages/lightbird/src/react/` — React hooks (headless, no UI deps) — subpath export `lightbird/react`
- `packages/ui/` — Drop-in styled React components (`@lightbird/ui`)
- `apps/web/` — Next.js app (lightbird.vercel.app)

**Key source files:**
- `packages/lightbird/src/video-processor.ts` — player factory + VideoPlayer interface
- `packages/lightbird/src/players/simple-player.ts` — HTML5 player wrapper
- `packages/lightbird/src/players/mkv-player.ts` — MKV player (FFmpeg.wasm)
- `packages/lightbird/src/subtitles/subtitle-converter.ts` — SRT → VTT conversion
- `packages/lightbird/src/subtitles/subtitle-manager.ts` — subtitle track management
- `packages/lightbird/src/react/` — React hooks (11 files)
- `packages/ui/src/lightbird-player.tsx` — main player component
- `packages/ui/src/player-controls.tsx` — playback controls UI
- `packages/ui/src/playlist-panel.tsx` — playlist management UI
- `apps/web/src/app/` — Next.js app (lightbird.vercel.app)
- `apps/web/src/app/docs/` — documentation page

**Improvement plans:** `memory-bank/plans/01-test-suite.md` through `12-npm-library-extraction/`

---

## Mandatory: Test Suite Requirements

> **Every code change must pass the full test suite before being committed or pushed.**

### Running the tests

```bash
pnpm turbo test           # run all package tests
pnpm test --filter lightbird   # core package only
pnpm test --filter @lightbird/ui  # UI package only
cd packages/lightbird && pnpm jest --watch  # dev mode
```

### Rules for all development work

1. **Run `pnpm turbo test` before every commit.** If tests fail, you must either fix the failing code or update the tests to match intentional behaviour changes.

2. **New features require new tests.** Any new function, hook, or component should be accompanied by tests in the appropriate `__tests__` directory:
   - Core library code → `packages/lightbird/__tests__/`
   - React hooks → `packages/lightbird/__tests__/react/`
   - UI components → `packages/ui/__tests__/`

3. **Do not skip or comment out failing tests.** If a test is obsolete because behaviour changed intentionally, delete it and add a replacement that covers the new behaviour.

4. **CI runs on every push and pull request** (`.github/workflows/test.yml`). A PR cannot be considered ready to merge if CI is red.

### Test infrastructure

| Tool | Purpose |
|---|---|
| Jest + ts-jest | Test runner (packages use ts-jest, app uses next/jest) |
| React Testing Library | Component rendering and interaction |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@testing-library/user-event` | Realistic user interaction simulation |

Config files: `packages/lightbird/jest.config.ts`, `packages/ui/jest.config.ts`, `jest.setup.ts` (shared at root)

---

## Mandatory: Memory Bank Updates

> **Every significant development task must update the memory bank.**

The memory bank lives in `memory-bank/`. It is the single source of truth for the project's current state.

- **`memory-bank/project-overview.md`** — overall status, architecture decisions, what is and isn't implemented. Update this when any plan is implemented or when architectural decisions change.
- **`memory-bank/plans/`** — improvement plans `01` through `12`. Mark a plan as `[DONE]` in its heading and add an implementation summary at the top when it is completed.

---

## Development Workflow

1. **Read the relevant plan** in `memory-bank/plans/` before starting.
2. **Write or update tests first** (or alongside the implementation).
3. **Implement** the changes.
4. **Run `pnpm turbo test`** and ensure all tests pass.
5. **Update `memory-bank/project-overview.md`** with what changed.
6. **Commit** with a descriptive message.

---

## Common Commands

```bash
pnpm turbo dev        # start all dev servers
pnpm turbo build      # build all packages + app
pnpm turbo test       # run all tests
pnpm turbo typecheck  # TypeScript type-check
pnpm turbo lint       # ESLint
pnpm dev --filter web # start web app on port 9002
```
