# Contributing to LightBird

## Getting Started

```bash
pnpm install
pnpm turbo build
pnpm turbo test
```

## Project Structure

```
packages/lightbird/   — @lightbird/core (framework-agnostic engine)
packages/ui/          — @lightbird/ui (React components)
apps/web/             — lightbird.vercel.app
```

## Commit Messages

This project uses **Conventional Commits** and **semantic-release**. Your PR title determines whether a new version is published to npm.

### PR title format

```
<type>: <description>
```

### Types

| Type | Triggers npm release? | Example |
|------|----------------------|---------|
| `feat:` | Yes (minor bump) | `feat: add chapter navigation UI` |
| `fix:` | Yes (patch bump) | `fix: subtitle offset not persisted` |
| `feat!:` | Yes (major bump) | `feat!: remove legacy player API` |
| `docs:` | No | `docs: update installation guide` |
| `chore:` | No | `chore: update dependencies` |
| `refactor:` | No | `refactor: simplify MKV remuxing` |
| `test:` | No | `test: add playlist edge cases` |
| `ci:` | No | `ci: fix publish workflow` |
| `style:` | No | `style: align control bar icons` |
| `perf:` | No | `perf: lazy-load FFmpeg worker` |

### Important

- Only use `feat:` or `fix:` when the change affects the published npm packages (`@lightbird/core` or `@lightbird/ui`)
- Changes only to the web app (docs page, landing page) should use `docs:` or `chore:`
- Breaking changes add `!` after the type: `feat!:` or `fix!:`

## Development Workflow

1. Fork and clone the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Add or update tests
5. Run `pnpm turbo test` and ensure all tests pass
6. Push and open a PR with a conventional commit title

## Testing

```bash
pnpm turbo test                              # all tests
pnpm test --filter @lightbird/core           # core only
pnpm test --filter @lightbird/ui             # UI only
cd packages/lightbird && pnpm jest --watch   # watch mode
```

New features require new tests:
- Core library → `packages/lightbird/__tests__/`
- React hooks → `packages/lightbird/__tests__/react/`
- UI components → `packages/ui/__tests__/`

## What happens when your PR is merged

- CI runs tests on every push and PR
- When merged to `master`, semantic-release analyzes the commit message
- If it's a `feat:` or `fix:`, a new version is automatically published to npm
- A GitHub release is created with auto-generated changelog

## License

MIT
