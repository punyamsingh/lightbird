# Issue HLS-03 — Stream Metadata in Video Info Panel

**Plan:** hls-dash
**Labels:** `enhancement`, `streaming`
**Depends on:** HLS-01
**Blocks:** —

---

## Problem

The `VideoInfoPanel` (Plan 09) only shows native HTML5 metadata. For HLS streams, richer data is available from `hls.js`: codec, resolution, bitrate, audio codec, and the number of renditions.

## Goal

Enrich the `VideoInfoPanel` with HLS-specific metadata when an HLS stream is playing.

## Acceptance Criteria

- [ ] When an `HLSPlayer` is active and the stream is loaded, `enrichMetadata` (from `useVideoInfo`) is called with:
  - `videoCodec` (from active level's codec string, e.g. `avc1.64002a` → `H.264`)
  - `videoBitrate` (from `hls.levels[hls.currentLevel].bitrate`)
  - `container`: `'HLS'`
  - `audioTracks`: mapped from `hls.audioTracks`
- [ ] The info panel displays a "Stream Renditions" row showing the total count (e.g. "4 levels").
- [ ] Enrichment re-runs when the quality level changes.
- [ ] All existing tests still pass.

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
