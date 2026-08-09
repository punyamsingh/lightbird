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
mirroring how `/react` is split. Base entry now measures 15.75 KB.

**Headroom is now 0.25 KB.** The next addition to the base entry will almost
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

New tests (163): `opensubtitles-hash.test.ts` (17), `subtitle-search.test.ts` (41),
`react/use-subtitle-search.test.ts` (25), `subtitle-manager-download.test.ts` (21),
`ui/__tests__/subtitle-search-panel.test.tsx` (17),
`web/__tests__/subtitles-provider.test.ts` (42)

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

### Self-review pass

Three further defects found reading the diff back:

- **The stale-item guard was dead code.** `handleSubtitleSearchApply` compared
  `playlist.currentItem?.id` before and after the await, but an async callback
  closes over the `playlist` object from the render that created it — both reads
  returned the same frozen value, so the comparison could never fail. Replaced
  with `currentItemIdRef`, updated in the effect that tracks the current item.
  (The download abort still fired correctly, so the bug was a false sense of
  safety rather than a live misapplication.)
- **A deployment with no API key errored before hiding.** The panel keys off
  `errorKind === 'unavailable'`, which is only set *after* a failed search — so
  the first click produced an error toast, and `reset()` cleared the verdict on
  every video change so the user could rediscover it repeatedly. `unavailable`
  now suppresses the toast and survives `reset()`, since it describes the
  deployment rather than the video.
- **The request timeout only covered headers.** `cleanup()` ran in the `finally`
  of the fetch block, before `response.json()`, so a response whose headers
  arrived promptly but whose body stalled would hang forever. The timer now
  stays armed across the body read.

### Second review pass

Two more, both the server-side or sibling half of a fix already applied elsewhere:

- **The proxy's deadline stopped at the response headers.** `fetchWithTimeout`
  cleared its timer in a `finally` as soon as `fetch()` resolved, then handed the
  Response back for the caller to read — so `readBounded()` and `.json()` ran
  unprotected. This is the same defect fixed client-side in the self-review pass;
  it was fixed on one side of the wire and missed on the other. `fetchWithTimeout`
  now takes a `consume` callback and reads the body inside the deadline.
- **A cancelled download could still be reported as a failure.** The download
  catch tested only `err.name === 'AbortError'`. A generic rejection already
  queued when `reset()` aborts would fall through to `onError`. It now checks
  `controller.signal.aborted` too — the same guard the search path already had.

Declined: a suggestion to change "afterwards" to "afterward" in this file.
CodeRabbit's LanguageTool runs an American-English profile, but the project's
prose is British (`behaviour` in `language-names.ts`, "Optimisation" in
CLAUDE.md), so the change would introduce the inconsistency it aims to remove.

### Third review pass

- **Discarded non-ok bodies were never cancelled.** `fetchWithTimeout` returns
  early on a non-ok response so status mapping does not pay to read a payload it
  discards — but an unread body holds its connection until the runtime collects
  it, so a provider answering 429 with a long error page would pin a socket per
  rejected request, exactly when the route is already under pressure. The helper
  now cancels the body before returning, inside the still-armed deadline so a
  stalled cancel cannot outlive the timeout, and swallows a cancel rejection so
  an already-errored stream cannot turn a mappable 401 into a thrown error.

  This is the third variant of one theme in this PR: the response body outlives
  the `fetch` promise, so every path that stops caring about a response has to
  say so explicitly — bound it (`readBounded`), keep the deadline over it
  (`consume`), or cancel it.

`apps/web` had no coverage for the proxy helper, so this pass adds
`__tests__/subtitles-provider.test.ts` (9 tests): the cancel-on-non-ok path with
both a stubbed and a real `ReadableStream` body, cancel-rejection tolerance, a
null body, `consume` running only for ok responses, the deadline still covering
a stalled body read, and `isTimeout` classification.

### Fourth review pass (full re-review)

The incremental reviewer would not re-review the branch, so a `full review` was
requested; it re-read all 27 files and found four more:

- **The provider's download link was fetched unvalidated.** The `download` route
  takes a URL out of the provider's JSON and fetches it server-side, returning
  the bytes to the caller. The link is not client-controlled, so this is not
  direct SSRF, but an unchecked hop makes the route a read primitive against
  whatever the deployment can reach. Links are now required to be `https:`, and
  because `fetch` follows redirects on its own — so a valid link can still land
  somewhere internal — redirects are followed by hand with `redirect: 'manual'`,
  each hop re-validated, bounded to 5. The helpers live in `provider.ts` rather
  than the route: App Router route files cannot export arbitrary functions, and
  keeping them there would have left the logic untestable.
- **An unrecognised subtitle extension was cast, not checked.** `addSubtitleFiles`
  cast the filename extension straight to the format union, so `movie.txt` was
  stored with `format: "txt"` — outside the declared type — and, because it is
  not `ass`/`ssa`, treated as timed text and attached as VTT with no conversion.
  Narrowed against a `SUBTITLE_FORMATS` list so anything unrecognised falls back
  to `vtt`. Pre-existing rather than introduced here, but in a file this PR
  reworks.
- **The stale-item guard was still a step behind.** `currentItemIdRef` was
  updated inside an effect, so it only caught up after React committed. A
  download resolving between `selectItem()` and that effect compared two
  pre-transition ids and passed. Replaced with a transition counter bumped
  synchronously in `loadVideo()` — the only path that moves between two items;
  every other `selectItem()` call runs with nothing playing. The effect still
  bumps it as a net for transitions that bypass `loadVideo()`. This is the third
  and final revision of this guard: dead code in `c3d4f11`, correct but
  late in `48660c7`, synchronous now.
- **`importSubtitles` left `activeId` stale.** It replaces every record and
  rebases `nextId`, so a leftover selection could collide with an id handed out
  afterwards and make the delayed disable skip a track the user never chose.
  `removeSubtitle` and `clearSubtitles` already reset it.

Also corrected the package name in `project-overview.md` — but in the opposite
direction to the suggestion. The reviewer read line 4's `@lightbird/player-react`
as the error; `packages/ui/package.json` confirms that is the real published
name, so the stale entries were the four `@lightbird/ui` references, one of
which was a `pnpm test --filter` command that could not have worked.

Declined two: forwarding a caller-supplied `AbortSignal` through
`fetchWithTimeout` (no caller passes one, and the reviewer rated it low value),
and replacing the result `<button>` with the ShadCN `Button` primitive — that
primitive is `inline-flex justify-center h-10` with `[&_svg]:size-4`, which
would collapse these two-row items and resize their `h-3 w-3` icons; six other
components in `packages/ui` use a raw `<button>` for the same reason.

New tests (+24): 9 `parseHttpsUrl` cases and 6 redirect-following cases in
`web/__tests__/subtitles-provider.test.ts`, plus 2 `activeId` invalidation and 7
format-detection cases in `subtitle-manager-download.test.ts`.

### Fifth review pass

One finding plus five nitpicks, two of which were aimed at the previous pass's
tests rather than its code — and were right:

- **A hash search could omit the file size.** `SubtitleSearchQuery` documents
  that the provider matches `moviehash` and `moviebytesize` together, but
  `searchSubtitles` only checked that a hash *or* text was present, so a
  hash-only query was forwarded as a malformed request and came back as an
  opaque provider error. Rejected up front instead. `useSubtitleSearch` always
  supplies both, so this only reachable through the public
  `@lightbird/core/search` entry — which is exactly why it is worth guarding.
- **The redirect deadline was per hop.** `fetchFollowingHttpsRedirects` passed
  the full `timeoutMs` to each of up to 5 hops, so a slow chain could hold the
  invocation open for 50 s — five times the bound the deadline exists to
  enforce. Now one budget computed once, with the remaining time passed to each
  hop and exhaustion raising `TimeoutError`.
- **`https:` alone did not mean external.** `parseHttpsUrl` accepted
  `https://169.254.169.254/`, so the scheme check did not actually achieve what
  its own comment claimed. Literal loopback, private, link-local, unique-local,
  and CGNAT addresses are now rejected, v4 and v6. A hostname allowlist would be
  stronger, but the provider's CDN hostnames are neither documented nor stable.
  **This does not stop a hostname that resolves to a private address** — that
  needs resolution-time checks the fetch API does not expose. Recorded rather
  than papered over.
- **An unbounded `fileId` produced the wrong status.** `/^\d+$/` accepts an
  arbitrarily long digit string, which `Number()` turns into `Infinity` and
  `JSON.stringify` writes as `null`; the provider then rejected it and the user
  saw a 502 for what is a 400. Bounded to 15 digits.

Two test corrections, both cases of a test that would have passed without the
code it claimed to cover:

- **The deadline test never observed the abort.** Its stalled `consume` callback
  rejected on its own 50 ms timer, so it passed on the `timedOut` flag alone and
  would have kept passing if `controller.abort()` were deleted. It now rejects
  only from the signal the helper arms.
- **The `activeId` import test could not fail.** Activating id `"0"` then
  importing a record with id `"0"` rebases `nextId` to 1, so the next
  registration mints `"1"` and the guard disables the track either way. The test
  now activates `"1"` so the post-import registration collides with the stale
  selection, and asserts the collision directly.

  Its companion for `removeSubtitle` was deleted rather than repaired: `nextId`
  only moves forward, so an id freed by a removal can never equal a later one,
  and no test can distinguish that reset being present from absent. The reset
  stays as hygiene, deliberately untested — better than a test asserting
  something it cannot observe, which is the same false confidence caught in
  `48660c7`.

New tests (+20): 11 internal-host rejections and 5 public-address acceptances in
`parseHttpsUrl`, an internal-redirect refusal, a shared-deadline assertion, and 3
`searchSubtitles` file-size cases. Net −1 in the manager suite from the deleted
test.

### Known limitation

`normalizeSearchResults` takes `attributes.files[0]` only. A multi-part entry
(legacy CD1/CD2 releases) therefore yields subtitles for the first part alone.
Surfacing both parts needs UI to label them, so it is deliberately out of scope.

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
