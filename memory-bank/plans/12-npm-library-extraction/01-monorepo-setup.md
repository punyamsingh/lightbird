# Phase 1 — Monorepo Setup

## Goal

Convert the flat repo into a pnpm + Turborepo monorepo without breaking anything.

## Why pnpm + Turborepo

- **pnpm** — strict dependency isolation (packages can't accidentally use undeclared deps), faster installs, disk-efficient via hard links. Industry standard for monorepos (Vue, Nuxt, SvelteKit, Vite all use pnpm).
- **Turborepo** — task runner that understands package dependency graph. `turbo run build` builds packages in the right order. Caches outputs. Vercel-native (zero config for deployment).

## Steps

### 1.1 Install pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

If corepack isn't available, `npm install -g pnpm`.

### 1.2 Create workspace config

**`pnpm-workspace.yaml`** (repo root):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.3 Create root `package.json`

Replace the current root `package.json` with a workspace root:

```json
{
  "name": "lightbird-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

No application dependencies at root level. Each package/app declares its own.

### 1.4 Create `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

`"dependsOn": ["^build"]` means "build my dependencies before running my task." So `@lightbird/ui` builds after `lightbird` builds. The app builds after both packages.

### 1.5 Create shared TypeScript config

**`tsconfig.base.json`** (repo root):
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Each package/app extends this with its own `tsconfig.json`.

### 1.6 Create directory structure

```bash
mkdir -p apps/web
mkdir -p packages/lightbird/src
mkdir -p packages/ui/src
```

### 1.7 Update `.gitignore`

Add to existing `.gitignore`:
```
# Turborepo
.turbo

# Package build outputs
packages/*/dist
```

## Verification

After this phase:
- `pnpm install` succeeds at root
- Directory structure exists: `apps/`, `packages/lightbird/`, `packages/ui/`
- `turbo.json` and `pnpm-workspace.yaml` are in place
- No code has moved yet — that's Phase 2-5

## Files Created

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Declares workspace packages |
| `turbo.json` | Task runner configuration |
| `tsconfig.base.json` | Shared TypeScript settings |
| Root `package.json` | Workspace root with turbo scripts |
