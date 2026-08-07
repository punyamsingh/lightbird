# Plan 14 — Online Subtitle Download (VLSub-style) [DONE]

## Implementation Summary (2026-08-07)

Issue [#79](https://github.com/punyamsingh/lightbird/issues/79). Implements VLC's VLSub loop:
fingerprint the video, ask OpenSubtitles for subtitles timed against that exact
release, download, convert, and apply — without leaving the player.

### What was built

1. **OpenSubtitles hash** — `src/subtitles/opensubtitles-hash.ts`.
   `computeOpenSubtitlesHash()` implements the provider's fingerprint: file size
   plus every little-endian uint64 in the first and last 64 KiB, modulo 2^64,
   rendered as 16 hex characters. Only 128 KiB is ever read, so a 20 GB remux
   hashes as fast as a 200 MB file. `fileNameToSearchQuery()` derives the text
   fallback, deliberately refusing to strip a trailing year as if it were an
   extension (`Blade.Runner.2049`).

2. **Search client** — `src/subtitles/subtitle-search.ts`.
   `searchSubtitles()` / `downloadSubtitle()` talk to a same-origin proxy and own
   the provider response mapping, so the proxy stays a thin pass-through. HTTP
   status is classified into a `SubtitleSearchErrorKind` (`unavailable`,
   `unauthorized`, `rate-limited`, `failed`) so the UI can tell "not deployed
   here" from a real failure. Results sort hash matches first.

3. **React hook** — `src/react/use-subtitle-search.ts`.
   Hashes when a `File` is available, searches by hash, and falls back to the
   filename only when the hash returns nothing. Supersedes in-flight requests via
   `AbortController` and reports which mode produced the results.

4. **Manager support** — `UniversalSubtitleManager.addSubtitleFromText()`.
   The file and network paths now share a private `registerSubtitle()`, so a
   downloaded subtitle gets the same SRT→VTT conversion, `<track>` attachment,
   cue index, and offset support as a dropped file. `useSubtitles` activates it
   immediately on add.

5. **Proxy routes** — `apps/web/src/app/api/subtitles/{search,download}/route.ts`,
   the first API routes in the repo. `download` performs both provider hops
   (request link → fetch file) server-side and decodes UTF-8 with a Windows-1252
   fallback for older European uploads.

6. **UI** — `packages/ui/src/subtitle-search-panel.tsx`, rendered inside the
   existing subtitles popover. Marks hash matches distinctly from filename
   matches, because the user needs to know whether to expect sync drift.

### Why a server proxy is mandatory

Two independent blockers, either one sufficient:

- OpenSubtitles requires an `Api-Key` header, which cannot ship in a client bundle.
- `apps/web/next.config.ts` sets `Cross-Origin-Embedder-Policy: require-corp` for
  FFmpeg.wasm, which blocks un-CORP'd cross-origin fetches regardless of the key.

The returned download link is also cross-origin, so hop 2 must be server-side too.

### Bundle budget

The first cut re-exported the search modules from the base `@lightbird/core`
entry and pushed it to 17.13 KB gzip against the 16.00 KB budget (issue #54).
Fixed by giving the feature its own entry point, `@lightbird/core/search`,
mirroring how `/react` is split. Base entry now measures 15.70 KB.

**Headroom is now 0.30 KB.** The next addition to the base entry will almost
certainly breach the budget — either split it out the same way or revisit the
number.

### Configuration

`OPENSUBTITLES_API_KEY` (required to enable) and optional
`OPENSUBTITLES_USER_AGENT`. Without the key the routes 404, the hook reports
`unavailable`, and the panel hides itself.

### Files

New: `src/subtitles/opensubtitles-hash.ts`, `src/subtitles/subtitle-search.ts`,
`src/search.ts`, `src/react/use-subtitle-search.ts`,
`packages/ui/src/subtitle-search-panel.tsx`,
`apps/web/src/app/api/subtitles/{provider.ts,search/route.ts,download/route.ts}`

Modified: `subtitle-manager.ts`, `use-subtitles.ts`, `types/index.ts`,
`src/index.ts`, `src/react/index.ts`, `tsup.config.ts`, `package.json`,
`packages/ui/src/{index.ts,player-controls.tsx,lightbird-player.tsx}`

New tests (105): `opensubtitles-hash.test.ts` (17), `subtitle-search.test.ts` (37),
`react/use-subtitle-search.test.ts` (21), `subtitle-manager-download.test.ts` (13),
`ui/__tests__/subtitle-search-panel.test.tsx` (17)

### Review hardening (PR #80)

Fixed after review, each with a regression test:

- **Registration timer disabled an activated track.** `registerSubtitle()` hides
  a new track then disables it 100 ms later so it does not show by default.
  `addSubtitleFromText()` activates immediately, so the timer switched off the
  subtitle the user had just applied. The manager now tracks `activeId` and the
  timer skips a track that has since been selected.
- **Stale downloads could land on the wrong video.** `reset()` aborted only the
  search. Downloads now carry their own `AbortController`, aborted on reset and
  unmount, and the player captures the playlist item id before downloading and
  discards the result if the user has moved on.
- **Superseded searches could publish stale errors.** The catch block now checks
  `controller.signal.aborted`, not just `AbortError`.
- **Manager swap across an await.** `useSubtitles.addSubtitleFromText()` captures
  the manager before awaiting and bails if it has been replaced.
- **Unbounded outbound requests.** Both proxy routes use `fetchWithTimeout`
  (10 s) and map expiry to 504; the client composes a 20 s timeout with the
  caller signal, deliberately avoiding `AbortSignal.any` (Chrome 116+/Safari
  17.4+) to keep the browser floor where the rest of the package sits.
- **Unbounded CDN read.** The download route streams the body and cancels the
  reader past 4 MiB instead of buffering first and measuring afterwards.
- **Result buttons announced as inert list text.** `role="listitem"` moved to a
  wrapper so each result keeps its native button role.

No new runtime dependencies.

---

## Not in scope (deferred)

- **Remote and torrent sources.** Neither exposes a `File`, so both degrade to
  the filename search. Hashing a remote URL needs two HTTP Range requests and
  origin CORS support; hashing a torrent needs first/last piece availability
  through `use-magnet`.
- **Language preferences and auto-fetch on load.** The hook already accepts a
  `languages` option; nothing persists or surfaces it yet.
- **Providers other than OpenSubtitles.** The client/proxy split makes this a
  matter of swapping the proxy, but no second provider is wired up.
