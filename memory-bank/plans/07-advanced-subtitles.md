# Plan 07 — Advanced Subtitle Support [DONE]

## Implementation Summary (2026-03-11)

All four goals implemented:

1. **Encoding detection** (`chardet` package) — `readSubtitleFile()` in `subtitle-manager.ts` reads any subtitle file's raw bytes, detects encoding via `chardet.detect()`, and decodes with the correct `TextDecoder`. Fixes Windows-1252 / ISO-8859-1 / Shift-JIS garbled text.

2. **Subtitle sync offset** — New `src/lib/subtitle-offset.ts` provides `shiftTimestamp()` and `applyOffsetToVtt()`. `UniversalSubtitleManager.setOffset(id, seconds)` regenerates the blob URL with shifted timestamps. A ±30 s slider in the subtitles popover (shown only for non-ASS active subtitles) calls `onSubtitleOffsetChange` → `handleSubtitleOffsetChange` → `setOffset`.

3. **ASS/SSA canvas renderer** — New `src/lib/ass-renderer.ts` uses `ass-compiler` (`compile()`) to render styled subtitles on a `<canvas>` overlay (absolute-positioned over the video). `LightBirdPlayer` starts/stops an `ASSRenderer` instance when ASS/SSA subtitles are activated. No `<track>` element is created for these files.

4. **Subtitle cue search** — `parseVttCues()` in `subtitle-manager.ts` builds a `SubtitleCue[]` index from VTT text. The subtitles popover includes a search field that `useMemo`-filters cues case-insensitively; each result shows the timestamp and, when clicked, seeks the video via `onSubtitleSeek`.

New files: `src/lib/subtitle-offset.ts`, `src/lib/ass-renderer.ts`
Modified: `src/lib/subtitle-manager.ts`, `src/components/player-controls.tsx`, `src/components/lightbird-player.tsx`, `src/types/index.ts`, `jest.setup.ts`
New tests: `src/lib/__tests__/subtitle-offset.test.ts`, `src/lib/__tests__/subtitle-manager-advanced.test.ts`
New dependencies: `chardet`, `ass-compiler`

## Problem

Current subtitle handling has several gaps:

1. **ASS/SSA styling is stripped**: The subtitle manager converts ASS/SSA files to VTT but discards all formatting (colors, positions, fonts). VTT supports basic styling but ASS is much richer.
2. **No subtitle sync adjustment**: Users cannot shift subtitles ±N seconds to fix sync issues without re-downloading a re-encoded file.
3. **No subtitle search/filtering** in the subtitle list when many subtitles are loaded.
4. **No "burn-in" preview**: No way to overlay subtitles on a screenshot.
5. **Subtitle encoding issues**: Non-UTF-8 encoded SRT files (e.g. Windows-1252 for European languages) render as garbled text.
6. **No character encoding detection**: The converter blindly reads files as UTF-8.

## Goal

- Proper ASS/SSA styling preserved in rendering (using a Canvas-based renderer).
- Subtitle delay/offset control in the UI (±30 seconds range).
- Auto-detect file encoding and transcode to UTF-8.
- A subtitle search field for navigating to a cue.

---

## Step-by-Step Implementation

### Step 1 — Fix File Encoding Detection

Before parsing any subtitle file, detect its encoding. Use `chardet` or a manual BOM check:

```bash
npm install chardet
```

In `subtitle-manager.ts`, before passing file text to the converter:

```ts
import chardet from 'chardet';

async function readSubtitleFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const detected = chardet.detect(Buffer.from(buffer)) ?? 'UTF-8';
  const decoder = new TextDecoder(detected);
  return decoder.decode(buffer);
}
```

This fixes garbled subtitles for files encoded in Windows-1252, ISO-8859-1, Shift-JIS, etc.

### Step 2 — Subtitle Time Offset (Sync Adjustment)

Add an offset value (in seconds) that is applied to all cue timestamps at display time.

**Approach A — VTT manipulation** (simpler): After converting to VTT, reparse and rewrite all timestamps with an offset, then update the blob URL.

```ts
function applyOffsetToVtt(vttText: string, offsetSeconds: number): string {
  return vttText.replace(
    /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/g,
    (_, start, end) => {
      const shiftedStart = shiftTimestamp(start, offsetSeconds);
      const shiftedEnd = shiftTimestamp(end, offsetSeconds);
      return `${shiftedStart} --> ${shiftedEnd}`;
    }
  );
}

function shiftTimestamp(ts: string, delta: number): string {
  const [h, m, s] = ts.split(':').map(Number);
  const totalSeconds = h * 3600 + m * 60 + s + delta;
  const clamped = Math.max(0, totalSeconds);
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  const ss = (clamped % 60).toFixed(3).padStart(6, '0');
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${ss}`;
}
```

When the user changes the offset slider, call `applyOffsetToVtt` and replace the `<track>` element's `src` with a new blob URL.

**Add to UI in `PlayerControls`:**

```tsx
// In the subtitle popover
<div className="flex items-center gap-2 mt-2">
  <Label className="text-xs">Sync offset</Label>
  <Slider
    min={-30} max={30} step={0.5}
    value={[subtitleOffset]}
    onValueChange={([v]) => onSubtitleOffsetChange(v)}
    className="w-32"
  />
  <span className="text-xs w-10">{subtitleOffset > 0 ? '+' : ''}{subtitleOffset}s</span>
</div>
```

### Step 3 — ASS/SSA Rendering via Canvas

The native `<track>` element cannot render ASS/SSA styling. The solution is to render styled subtitles on a `<canvas>` overlay using a JavaScript ASS renderer.

Install `ass-compiler` (a pure-JS ASS parser and renderer):

```bash
npm install ass-compiler
```

> Alternative: `jassub` (WebAssembly-based, higher fidelity but larger bundle). Use `ass-compiler` for simplicity first.

Create `src/lib/ass-renderer.ts`:

```ts
import { parse, CompiledASSStyle, CompiledEvent } from 'ass-compiler';

export class ASSRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private events: CompiledEvent[] = [];
  private animFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  load(assText: string) {
    const parsed = parse(assText);
    this.events = parsed.events.dialogue;
    // Store styles from parsed.styles
  }

  renderAt(currentTimeSec: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const active = this.events.filter(e => e.Start <= currentTimeSec && e.End >= currentTimeSec);
    for (const event of active) {
      this.drawEvent(event);
    }
  }

  start(videoEl: HTMLVideoElement) {
    const loop = () => {
      this.renderAt(videoEl.currentTime);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  private drawEvent(event: CompiledEvent) {
    // Implement basic text rendering with style from event.Style
    // Handle alignment, color, outline, shadow
  }
}
```

In `LightBirdPlayer`, add a `<canvas>` element overlaid on the video:

```tsx
<div className="relative">
  <video ref={videoRef} />
  <canvas
    ref={assCanvasRef}
    className="absolute inset-0 pointer-events-none"
    width={videoRef.current?.videoWidth}
    height={videoRef.current?.videoHeight}
  />
</div>
```

When an `.ass` or `.ssa` file is loaded:
- Do NOT add it as a `<track>` element.
- Instead, create an `ASSRenderer` instance and call `renderer.start(videoRef.current)`.
- When the subtitle is removed, call `renderer.stop()` and clear the canvas.

### Step 4 — Subtitle Search / Jump-to-Cue

Parse the VTT/SRT in memory to build an index of `(startTime, text)` pairs. Add a search bar to the subtitle panel:

```tsx
<Input
  placeholder="Search subtitles..."
  value={search}
  onChange={e => setSearch(e.target.value)}
  className="h-7 text-xs mb-2"
/>
{searchResults.map(result => (
  <button
    key={result.startTime}
    onClick={() => videoRef.current!.currentTime = result.startTime}
    className="text-xs text-left w-full px-2 py-1 hover:bg-muted rounded"
  >
    <span className="text-muted-foreground mr-2">{formatTime(result.startTime)}</span>
    {result.text}
  </button>
))}
```

Build `searchResults` with a `useMemo` that filters the cue index by `search` string (case-insensitive).

### Step 5 — Update `UniversalSubtitleManager`

Modify `subtitle-manager.ts` to:
1. Use `readSubtitleFile()` with encoding detection for all file reads.
2. Expose a `setOffset(subtitleId, seconds)` method.
3. Distinguish between VTT/SRT subtitles (track element) and ASS/SSA subtitles (canvas renderer) and route accordingly.

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Modify | `src/lib/subtitle-manager.ts` (encoding detection, offset, ASS routing) |
| Create | `src/lib/ass-renderer.ts` |
| Create | `src/lib/subtitle-offset.ts` (VTT timestamp shifting logic) |
| Modify | `src/components/player-controls.tsx` (offset slider, search) |
| Modify | `src/components/lightbird-player.tsx` (canvas overlay, ASS renderer lifecycle) |
| Install | `chardet`, `ass-compiler` |

---

## Success Criteria

- A Windows-1252 encoded SRT file renders correctly (no garbled characters).
- The sync offset slider shifts subtitle timing visibly in real time.
- An ASS/SSA file with colored, positioned text renders correctly on the canvas overlay.
- Searching "hello" in the subtitle search shows all cues containing "hello" with their timestamps; clicking one seeks the video.
