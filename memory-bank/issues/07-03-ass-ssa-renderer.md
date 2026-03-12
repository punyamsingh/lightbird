# Issue 07-03 — ASS/SSA Canvas Renderer

**Plan:** 07 — Advanced Subtitle Support
**Phase:** 3 (Power Features)
**Labels:** `enhancement`, `subtitles`, `plan-07`
**Depends on:** —
**Blocks:** —

---

## Problem

ASS/SSA subtitle files contain rich styling (colors, positions, fonts, animations). The current approach converts them to VTT which strips all styling, losing the author's intended presentation.

## Goal

Render ASS/SSA subtitles on a `<canvas>` overlay that preserves colors, positions, and basic styling.

## Acceptance Criteria

- [ ] `ass-compiler` npm package is installed.
- [ ] `src/lib/ass-renderer.ts` is created with an `ASSRenderer` class:
  - `constructor(canvas: HTMLCanvasElement)` — stores canvas and 2D context.
  - `load(assText: string): void` — parses ASS with `ass-compiler` and stores compiled events.
  - `start(videoEl: HTMLVideoElement): void` — starts a `requestAnimationFrame` loop calling `renderAt(videoEl.currentTime)`.
  - `stop(): void` — cancels the animation frame.
  - `renderAt(currentTimeSec: number): void` — clears canvas and draws all active cues at the given timestamp.
- [ ] `ASSRenderer.renderAt` draws at minimum: cue text, position (alignment-based), foreground color. Additional styling (outline, shadow) is a bonus.
- [ ] The existing `<canvas ref={canvasRef}>` overlay in `lightbird-player.tsx` is reused for ASS rendering (it already exists per Plan 02 for screenshots). If it conflicts, a dedicated `assCanvasRef` is added.
- [ ] When an `.ass` or `.ssa` file is added as a subtitle:
  - It is NOT added as a `<track>` element.
  - An `ASSRenderer` is created and `start()` is called.
  - When a different subtitle is selected or the ASS subtitle is removed, `stop()` is called and the canvas is cleared.
- [ ] When an `.ass` file is selected while a VTT subtitle is active, the VTT track is hidden.
- [ ] Unit tests in `src/lib/__tests__/ass-renderer.test.ts`:
  - `load()` parses without throwing on a minimal valid ASS string.
  - `renderAt()` calls `clearRect` on the canvas context.
  - `stop()` cancels animation frame (mock `requestAnimationFrame`).
- [ ] All existing tests still pass.

## Files

| Action | Path |
|--------|------|
| Install | `ass-compiler` |
| Create | `src/lib/ass-renderer.ts` |
| Create | `src/lib/__tests__/ass-renderer.test.ts` |
| Modify | `src/lib/subtitle-manager.ts` (route ASS/SSA to canvas renderer) |
| Modify | `src/components/lightbird-player.tsx` (lifecycle: start/stop renderer) |
