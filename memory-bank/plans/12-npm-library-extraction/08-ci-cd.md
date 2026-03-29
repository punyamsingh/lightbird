# Phase 8 — CI/CD

## Goal

Update GitHub Actions for the monorepo. Ensure Vercel deployment still works. Set up npm publish workflow.

## GitHub Actions: Test Workflow

### `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm turbo build --filter=lightbird --filter=@lightbird/ui

      - name: Typecheck
        run: pnpm turbo typecheck

      - name: Lint
        run: pnpm turbo lint

      - name: Test
        run: pnpm turbo test
```

Key changes from current workflow:
- Uses `pnpm/action-setup` instead of npm
- Builds packages before testing (UI tests need core built)
- Uses turbo to run tasks in dependency order

## GitHub Actions: Publish Workflow (optional, for later)

### `.github/workflows/publish.yml`

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo build

      - name: Test
        run: pnpm turbo test

      - name: Publish lightbird
        run: pnpm --filter lightbird publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish @lightbird/ui
        run: pnpm --filter @lightbird/ui publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup required:**
1. Generate npm token at npmjs.com → Access Tokens → Automation token
2. Add as `NPM_TOKEN` secret in GitHub repo settings → Secrets → Actions

**Publishing workflow:**
```bash
# 1. Bump versions in both package.json files
# 2. Commit: "chore: release v0.1.0"
# 3. Tag: git tag v0.1.0
# 4. Push: git push && git push --tags
# → GitHub Action builds, tests, and publishes both packages
```

## Vercel Deployment

Vercel auto-detects Turborepo monorepos. Configuration needed:

### Vercel Project Settings

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Build Command | `cd ../.. && pnpm turbo build --filter=web...` |
| Install Command | `pnpm install` |
| Output Directory | `.next` |

The `--filter=web...` (note the `...`) means "build `web` AND all its dependencies." So Turborepo builds `lightbird` first, then `@lightbird/ui`, then the web app.

### `apps/web/vercel.json` (if needed)

Usually Vercel auto-detects. If not, create:

```json
{
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=web..."
}
```

### COOP/COEP Headers

The existing `next.config.ts` headers for SharedArrayBuffer (FFmpeg.wasm) stay in `apps/web/next.config.ts`. No change needed.

## Verification

After this phase:
- Push to any branch → GitHub Actions runs tests successfully
- Push to main → GitHub Actions runs tests successfully
- Vercel deployment still works → lightbird.vercel.app loads correctly
- (Optional) Tag push → packages published to npm

## Notes

- Don't set up the publish workflow until after the first manual publish (Phase 11). Verify everything works manually first.
- The publish workflow can be added as a follow-up PR.
