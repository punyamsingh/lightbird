# LightBird — Development Guide for Claude

## Project Summary

LightBird is a modern, lightweight video player built with **Next.js 15** and **React 18**. It uses a dual-player architecture: a native HTML5 player for common formats (MP4, WebM, AVI) and a placeholder MKV player for complex containers.

**Tech stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, ShadCN UI (Radix UI), FFmpeg.wasm (planned), Firebase (configured but unused).

**Key source files:**
- `src/components/lightbird-player.tsx` — main player component
- `src/components/player-controls.tsx` — playback controls UI
- `src/components/playlist-panel.tsx` — playlist management UI
- `src/lib/subtitle-converter.ts` — SRT → VTT conversion
- `src/lib/subtitle-manager.ts` — subtitle track management
- `src/lib/video-processor.ts` — player factory (`createVideoPlayer`)
- `src/lib/players/simple-player.ts` — HTML5 player wrapper
- `src/lib/players/mkv-player.ts` — MKV player (placeholder, needs FFmpeg)
- `src/types/index.ts` — shared TypeScript types

**Improvement plans:** `memory-bank/plans/01-test-suite.md` through `10-codebase-cleanup.md`

---

## Mandatory: Test Suite Requirements

> **Every code change must pass the full test suite before being committed or pushed.**

### Running the tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode for development
npm run test:coverage # run with coverage report (target: >70% on src/lib/)
```

### Rules for all development work

1. **Run `npm test` before every commit.** If tests fail, you must either fix the failing code or update the tests to match intentional behaviour changes.

2. **New features require new tests.** Any new function, hook, or component should be accompanied by tests in the appropriate `__tests__` directory:
   - Library code → `src/lib/__tests__/`
   - Components → `src/components/__tests__/`

3. **Do not skip or comment out failing tests.** If a test is obsolete because behaviour changed intentionally, delete it and add a replacement that covers the new behaviour.

4. **CI runs on every push and pull request** (`.github/workflows/test.yml`). A PR cannot be considered ready to merge if CI is red.

### Test infrastructure

| Tool | Purpose |
|---|---|
| Jest | Test runner and coverage |
| React Testing Library | Component rendering and interaction |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@testing-library/user-event` | Realistic user interaction simulation |

Config files: `jest.config.ts`, `jest.setup.ts`

---

## Mandatory: Memory Bank Updates

> **Every significant development task must update the memory bank.**

The memory bank lives in `memory-bank/`. It is the single source of truth for the project's current state.

- **`memory-bank/project-overview.md`** — overall status, architecture decisions, what is and isn't implemented. Update this when any plan is implemented or when architectural decisions change.
- **`memory-bank/plans/`** — improvement plans `01` through `10`. Mark a plan as `[DONE]` in its heading and add an implementation summary at the top when it is completed.

**When to update the memory bank:**
- After completing any plan (mark done, summarise what was built)
- After any architectural change (new hooks, new components, new dependencies)
- After any change to the project's tech stack or configuration
- When you discover important constraints or decisions that future contributors need to know

---

## Development Workflow

1. **Read the relevant plan** in `memory-bank/plans/` before starting.
2. **Write or update tests first** (or alongside the implementation).
3. **Implement** the changes.
4. **Run `npm test`** and ensure all tests pass.
5. **Update `memory-bank/project-overview.md`** with what changed.
6. **Commit** with a descriptive message.

---

## Common Commands

```bash
npm run dev           # start dev server on port 9002
npm run build         # production build
npm run lint          # ESLint
npm run typecheck     # TypeScript type-check (no emit)
npm test              # run test suite
npm run test:coverage # run with coverage
```
