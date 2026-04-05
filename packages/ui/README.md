# @lightbird/ui

Drop-in React video player component powered by [LightBird](https://www.npmjs.com/package/lightbird). Full controls, playlist, subtitles, chapters — one import.

**[Documentation](https://lightbird.vercel.app/docs)** | **[Live Demo](https://lightbird.vercel.app)** | **[GitHub](https://github.com/punyamsingh/lightbird)**

## Install

```bash
npm install lightbird @lightbird/ui
```

## Usage

```tsx
"use client"

import { LightBirdPlayer } from '@lightbird/ui'

export default function VideoPage() {
  return <LightBirdPlayer />
}
```

### Tailwind CSS Setup

Add to your `tailwind.config.ts`:

```ts
content: [
  // ...your paths
  './node_modules/@lightbird/ui/dist/**/*.js',
]
```

Or use the pre-compiled stylesheet:

```tsx
import '@lightbird/ui/styles.css'
```

## Exported Components

- `<LightBirdPlayer />` — Full player (drop-in)
- `<PlayerControls />` — Standalone control bar
- `<PlaylistPanel />` — Standalone playlist sidebar
- `<Toaster />` — Toast notification provider

## Requires

- `lightbird` (included as dependency)
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

## Documentation

Full API reference at **[lightbird.vercel.app/docs](https://lightbird.vercel.app/docs)**

## License

MIT
