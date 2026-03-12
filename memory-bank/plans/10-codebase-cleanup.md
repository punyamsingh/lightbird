# Plan 10 — Codebase Cleanup & Dependency Audit [DONE]

## Implementation Summary (2026-03-12)

- **Removed deprecated functions** — `probeFile()` and `remuxFile()` deleted from `src/lib/video-processor.ts`.
- **Re-enabled strict build checks** — `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` removed from `next.config.ts`.
- **Removed unused ShadCN components** — Deleted `accordion`, `alert-dialog`, `avatar`, `calendar`, `carousel`, `chart`, `dropdown-menu`, `menubar`, `tabs` from `src/components/ui/`.
- **Uninstalled unused packages** — `firebase`, `recharts`, `genkit`, `@genkit-ai/googleai`, `@genkit-ai/next`, `genkit-cli` removed via `npm uninstall`.
- **Removed `src/ai/` directory** — Genkit setup files (`genkit.ts`, `dev.ts`) deleted.
- **Removed genkit scripts** — `genkit:dev` and `genkit:watch` removed from `package.json`.
- **Added `.env.example`** — Documents optional Firebase environment variables.

---


## Problem

Several areas of the codebase are cluttered with unused or legacy code that adds maintenance burden without providing value:

1. **Deprecated functions in `video-processor.ts`**: `probeFile()` and `remuxFile()` are marked deprecated with JSDoc but still present. They do nothing useful and confuse readers.
2. **Firebase is configured but unused**: `firebase.json`, `apphosting.yaml`, and Firebase SDK (11.9.1, ~200 kB gzipped) are present but no Firebase feature is actually implemented.
3. **Google Genkit AI is configured but unused**: `src/ai/` directory with Genkit setup, `genkit:dev` script, and the `genkit` dependency add weight with no active functionality.
4. **`next.config.ts` suppresses TypeScript and ESLint build errors**: `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` are set, meaning real errors are silently hidden in production builds.
5. **ReCharts (data visualization) is installed but never used**: No chart components exist in the UI.
6. **`src/components/ui/` contains 35 ShadCN components** but only a subset are actually imported by the app. Unused UI components add to bundle size.
7. **`MkvPlayer` has dead code**: `remuxFile()` stub and commented-out FFmpeg import blocks are present.
8. **No `.env.example`**: The project uses environment variables (Firebase config, Google AI API key) with no documented example for new developers.
9. **`apphosting.yaml` locks to 1 instance**: Unnecessary constraint for a static/client-only app; could be removed or corrected to reflect that.
10. **Missing `"use client"` directive consistency**: Some components that use hooks may be missing the directive needed for Next.js App Router.

## Goal

- Remove dead code and unused imports.
- Safely remove or isolate unused dependencies to reduce bundle size.
- Re-enable TypeScript and ESLint error checking in the build.
- Fix any errors surfaced by re-enabling strict build checks.
- Add `.env.example` to document required environment variables.
- Audit and trim unused ShadCN components.

---

## Step-by-Step Implementation

### Step 1 — Remove Deprecated Functions from `video-processor.ts`

Delete the `probeFile()` and `remuxFile()` stub functions. Search the entire codebase for any calls to them first:

```bash
grep -r "probeFile\|remuxFile" src/
```

If no calls exist (expected), delete the functions. If calls exist, migrate them to the new `MkvPlayer` API (Plan 02) first.

### Step 2 — Re-enable TypeScript and ESLint Strict Checking

In `next.config.ts`, change:

```ts
// Before:
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },

// After: remove both options entirely (they default to false = errors fail the build)
```

Then run:

```bash
npm run typecheck
npm run lint
```

Fix all reported errors. Common issues to expect:
- Missing return types on exported functions.
- `any` usages that need proper typing.
- Unused variables (ESLint `no-unused-vars`).
- Missing `"use client"` directives on components that use hooks.

This is the most important step: catching bugs that were silently hidden.

### Step 3 — Audit Unused ShadCN Components

Run a grep to find which `src/components/ui/` components are imported anywhere:

```bash
for f in src/components/ui/*.tsx; do
  name=$(basename "$f" .tsx)
  count=$(grep -rl "$name" src/ --include="*.tsx" --include="*.ts" | grep -v "^src/components/ui/$name.tsx" | wc -l)
  echo "$count $name"
done | sort -n
```

Components with `count = 0` are unused. Delete them. Typical unused ones in a video player context:
- `accordion.tsx`, `calendar.tsx`, `chart.tsx`, `data-table.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `resizable.tsx`

Removing unused components reduces the bundle and removes dead code.

### Step 4 — Remove or Isolate Unused Dependencies

#### Option A — Remove Firebase entirely (if no plans to use it)

```bash
npm uninstall firebase
```

Also delete:
- `firebase.json`
- `apphosting.yaml`
- Any Firebase initialization code

#### Option B — Keep Firebase but don't include it in the bundle

If Firebase is planned for future use (cloud sync, etc.), move its initialization into a server-side route or a dynamically imported module:

```ts
// src/lib/firebase.ts — only imported when needed, never in the main bundle
import { initializeApp } from 'firebase/app';
// ...
```

Ensure it is NOT imported from any client component that is part of the initial bundle.

#### Remove Genkit (if AI features are not planned soon)

```bash
npm uninstall genkit @genkit-ai/googleai @genkit-ai/next
```

Delete `src/ai/` directory and remove the `genkit:dev` and `genkit:watch` scripts from `package.json`.

If Genkit IS planned (AI-powered features), leave it but at least move it behind a dynamic import so it doesn't inflate the main bundle.

#### Remove ReCharts

```bash
npm uninstall recharts
```

Verify no `recharts` imports remain:

```bash
grep -r "recharts" src/
```

### Step 5 — Remove Dead Code from `MkvPlayer`

- Delete commented-out FFmpeg import blocks.
- Delete the `remuxFile()` stub if it still exists.
- Clean up any `TODO` comments that reference the old placeholder approach (replace with comments referencing Plan 02 if work is in progress, or remove if implemented).

### Step 6 — Add `.env.example`

Create `.env.example` at the project root documenting all required and optional environment variables:

```env
# Google AI (Genkit) — required for AI features
GOOGLE_GENAI_API_KEY=your_google_ai_api_key_here

# Firebase — required for cloud playlist sync (optional feature)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Add `.env.local` to `.gitignore` if not already there (it typically is in Next.js projects).

### Step 7 — Add `"use client"` Audit

Next.js App Router requires `"use client"` at the top of any component that:
- Uses `useState`, `useEffect`, `useRef`, or any other React hook.
- Attaches event handlers.
- Uses browser APIs (`window`, `document`, `localStorage`).

Audit all files in `src/components/` and `src/hooks/`:

```bash
grep -rL '"use client"' src/components/ src/hooks/ | xargs grep -l "useState\|useEffect\|useRef\|onClick\|window\."
```

Files returned by this command are missing the directive. Add `"use client";` as the first line of each.

### Step 8 — Fix ESLint Configuration

The project uses default Next.js ESLint rules. Consider adding stricter rules to `eslint.config.mjs`:

```js
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'react-hooks/exhaustive-deps': 'warn',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
}
```

### Step 9 — Verify Build Passes

After all cleanup:

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass with zero errors.

### Step 10 — Update `apphosting.yaml`

If Firebase App Hosting is kept, review the `maxInstances: 1` constraint. For a purely static/client-side app this is fine, but if server-side features are added later, it becomes a bottleneck. At minimum, add a comment explaining the intent:

```yaml
# LightBird is a client-side video player with no server-side state.
# One instance is sufficient; scale up if server routes are added.
runConfig:
  maxInstances: 1
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Modify | `src/lib/video-processor.ts` (delete deprecated stubs) |
| Modify | `next.config.ts` (re-enable TS/ESLint strict checks) |
| Delete | Unused `src/components/ui/*.tsx` files (post-audit) |
| Uninstall | `firebase`, `recharts`, `genkit` packages (post-decision) |
| Delete | `src/ai/` directory (if Genkit removed) |
| Delete | `firebase.json`, `apphosting.yaml` (if Firebase removed) |
| Modify | `src/lib/players/mkv-player.ts` (remove dead code) |
| Create | `.env.example` |
| Modify | Various `src/components/` files (add `"use client"` where missing) |
| Modify | `eslint.config.mjs` (stricter rules) |

---

## Success Criteria

- `npm run build` completes with zero TypeScript errors and zero ESLint errors.
- Bundle size is reduced (measure with `npm run build` output — check `.next/analyze` if `@next/bundle-analyzer` is added).
- No unused dependencies remain in `package.json`.
- `.env.example` documents all environment variables.
- No deprecated or dead-code functions exist in source files.
- All client components have `"use client"` directive.
