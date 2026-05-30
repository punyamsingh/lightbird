# Issue HLS-03 — Stream Metadata in Video Info Panel [DONE]

**Plan:** hls-dash
**Labels:** `enhancement`, `streaming`
**Depends on:** HLS-01
**Blocks:** —

---

## Implementation Summary (done)

- `HLSPlayer.getMetadata()` (`packages/lightbird/src/players/hls-player.ts`) returns
  `{ container: 'HLS', videoCodec, videoBitrate, streamRenditions, audioTracks }`
  derived from the active rendition (`hls.levels[hls.currentLevel]`, falling back
  to the first level while ABR settles).
- `parseHlsCodec()` maps MIME codec strings (`avc1` → `H.264 (AVC)`,
  `hvc1`/`hev1` → `H.265 (HEVC)`, `vp09` → `VP9`, `av01` → `AV1`, else raw),
  exported from `@lightbird/core`.
- `HLSPlayer.onMetadataChange(cb)` subscribes to `MANIFEST_PARSED`,
  `LEVEL_SWITCHED`, and `AUDIO_TRACKS_UPDATED`, returning an unsubscribe fn, so
  enrichment re-runs when the quality level changes.
- `VideoMetadata` gained an optional `streamRenditions?: number | null` field.
- `lightbird-player.tsx` routes HLS stream playlist items through an `HLSPlayer`
  and calls `enrichMetadata(player.getMetadata())` on load and on every
  metadata event.
- `video-info-panel.tsx` renders a **Stream Renditions** row (`"N levels"`) when
  `streamRenditions` is present.
- Tests: extended `__tests__/hls-player.test.ts` (parseHlsCodec, getMetadata,
  onMetadataChange) and added `packages/ui/__tests__/video-info-panel.test.tsx`.

---

## Problem

The `VideoInfoPanel` (Plan 09) only shows native HTML5 metadata. For HLS streams, richer data is available from `hls.js`: codec, resolution, bitrate, audio codec, and the number of renditions.

## Goal

Enrich the `VideoInfoPanel` with HLS-specific metadata when an HLS stream is playing.

## Acceptance Criteria

- [x] When an `HLSPlayer` is active and the stream is loaded, `enrichMetadata` (from `useVideoInfo`) is called with:
  - [x] `videoCodec` (from active level's codec string, e.g. `avc1.64002a` → `H.264`)
  - [x] `videoBitrate` (from `hls.levels[hls.currentLevel].bitrate`)
  - [x] `container`: `'HLS'`
  - [x] `audioTracks`: mapped from `hls.audioTracks`
- [x] The info panel displays a "Stream Renditions" row showing the total count (e.g. "4 levels").
- [x] Enrichment re-runs when the quality level changes.
- [x] All existing tests still pass.

## Implementation Notes

`hls.js` codec strings use MIME-type codec format (e.g. `avc1.640028`). Parse the leading four chars to determine the codec family:
- `avc1` → `H.264 (AVC)`
- `hvc1` / `hev1` → `H.265 (HEVC)`
- `vp09` → `VP9`
- `av01` → `AV1`

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/players/hls-player.ts` (expose getMetadata method) |
| Modify | `src/components/lightbird-player.tsx` (call enrichMetadata after HLS loads) |
| Modify | `src/components/video-info-panel.tsx` (add stream renditions row) |
