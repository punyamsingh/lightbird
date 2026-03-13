# Sub-plan 05 — Native Playback First (Skip FFmpeg When Possible)

## Status: DONE

## Independent Of Sub-plans 1–4

This plan adds a pre-check before any FFmpeg work. It modifies only `initialize()` and
adds one helper function. Implement at any point — it doesn't conflict with other sub-plans.

---

## Problem

The current `initialize()` always runs FFmpeg, even when the MKV file contains H.264
video + AAC audio — a codec combination that Chrome, Firefox, and Safari can all play
natively in an MKV (Matroska) container.

This adds 5–30 seconds of unnecessary delay.

---

## Goal

Before invoking FFmpeg, test whether the browser can play the raw file directly. If yes,
skip FFmpeg entirely and set `video.src` to an `objectURL` of the original file. Fall
through to FFmpeg only on failure.

---

## URL Ownership Rule

**`canPlayNatively()` does NOT create or return an objectURL.** It receives a pre-created
URL from the caller and only reads it. This rule prevents double-creation and makes cleanup
unambiguous: `MKVPlayer.initialize()` is the single owner of the objectURL lifecycle.

```
initialize() creates URL → passes to canPlayNatively() (read-only)
  ├─ canPlay = true  → keep URL on this.objectUrl, assign to video.src
  └─ canPlay = false → revoke URL (probe is done, FFmpeg will produce a new URL)
```

---

## Helper Function: `canPlayNatively()`

Add this near the top of `src/lib/players/mkv-player.ts` (outside the class):

```typescript
/**
 * Tests whether the browser can natively play a file given a pre-created objectURL.
 *
 * The CALLER owns the objectURL — this function never creates or revokes it.
 *
 * @param objectUrl  An objectURL already created by the caller (URL.createObjectURL).
 * @param timeoutMs  Maximum ms to wait for canplay before giving up (default 3000).
 * @returns          true if canplay fired, false if error or timeout.
 */
export async function canPlayNatively(
  objectUrl: string,
  timeoutMs = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');

    const cleanup = (result: boolean) => {
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load(); // stop any pending fetch on the probe element
      resolve(result);
      // NOTE: do NOT revoke objectUrl here — the caller owns it
    };

    const timer = setTimeout(() => cleanup(false), timeoutMs);

    video.oncanplay = () => cleanup(true);
    video.onerror  = () => cleanup(false);

    video.preload = 'metadata'; // only fetch the container header
    video.src = objectUrl;
    video.load();
  });
}
```

---

## Integration in `MKVPlayer.initialize()`

Add the check at the very start of the `try` block, before any FFmpeg import.
`initialize()` creates the objectURL, passes it to the probe, then decides what to do:

```typescript
async initialize(videoElement: HTMLVideoElement): Promise<MKVPlayerFile> {
  this.videoElement = videoElement;

  try {
    // ── Fast path: try native playback first ─────────────────────────────
    // initialize() owns this URL for the entire native path.
    const probeUrl = URL.createObjectURL(this.file);

    const nativeOk = await canPlayNatively(probeUrl);

    if (nativeOk) {
      // Keep the URL — store it for later cleanup in destroy()
      this.objectUrl = probeUrl;
      this.playerFile.videoUrl = probeUrl;
      // Native playback: browser exposes audio tracks via HTMLMediaElement.audioTracks
      // but that API has limited browser support. Use a safe default.
      this.playerFile.audioTracks = [{ id: '0', name: 'Default Audio', lang: 'unknown' }];
      videoElement.src = probeUrl;
      this.onProgress?.(1);
      return this.playerFile;
    }

    // Probe URL is no longer needed — revoke it before FFmpeg creates its own.
    URL.revokeObjectURL(probeUrl);

    // ── Slow path: FFmpeg remux ───────────────────────────────────────────
    // ... existing FFmpeg / worker code ...

  } catch (error) {
    // ... existing fallback ...
  }

  return this.playerFile;
}
```

---

## Edge Cases

### "canplay fires but codec is broken"

Some browsers fire `canplay` for containers they partially support. To guard against
silent failure after returning early:

- The `video.onerror` event on the **real** player element (in `lightbird-player.tsx`)
  will still fire if playback fails after `initialize()` returns.
- The existing error handling in `lightbird-player.tsx` (the `toast` in the `catch` block)
  covers this — no extra work needed.

### "canplay fires slowly because the file is large"

`preload="metadata"` instructs the browser to read only the container header (~a few KB).
This fires `canplay` in under 100ms for local files, well within the 3-second timeout.

### "browser says it can play, but audio tracks are wrong"

When taking the native path, `playerFile.audioTracks` is set to a single entry
`[{ id: '0', name: 'Default Audio' }]`. The real track count is unknown without probing.
This is acceptable — the native path is only taken when the browser already handles the
container, so track switching is not needed (there is only one audio source anyway, the
native one).

---

## Tests to Add in `src/lib/__tests__/mkv-player.test.ts`

```typescript
describe('canPlayNatively()', () => {
  // canPlayNatively receives a pre-created URL string — it does NOT call
  // URL.createObjectURL or URL.revokeObjectURL.

  it('resolves true when video fires canplay', async () => {
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:test-url', 1000);
    mockVideo.oncanplay?.();

    await expect(promise).resolves.toBe(true);
    // Must NOT revoke the URL (caller owns it)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('resolves false when video fires error', async () => {
    const mockVideo = {
      oncanplay: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:test-url', 1000);
    mockVideo.onerror?.();

    await expect(promise).resolves.toBe(false);
  });

  it('resolves false after timeout', async () => {
    jest.useFakeTimers();
    const mockVideo = {
      oncanplay: null,
      onerror: null,
      src: '',
      preload: '',
      load: jest.fn(),
      removeAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as unknown as HTMLVideoElement);

    const promise = canPlayNatively('blob:test-url', 500);
    jest.advanceTimersByTime(600);

    await expect(promise).resolves.toBe(false);
    jest.useRealTimers();
  });
});

describe('MKVPlayer.initialize() native path', () => {
  it('keeps probeUrl on this.objectUrl when canPlayNatively returns true', async () => {
    jest.spyOn(mkvPlayerModule, 'canPlayNatively').mockResolvedValue(true);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:probe-url');
    const revoke = jest.spyOn(URL, 'revokeObjectURL');

    const player = new MKVPlayer(mockFile);
    const result = await player.initialize(mockVideoElement);

    expect(mockVideoElement.src).toBe('blob:probe-url');
    // URL must NOT be revoked — it's now the active playback URL
    expect(revoke).not.toHaveBeenCalledWith('blob:probe-url');
    expect(workerPostMessage).not.toHaveBeenCalled();
    expect(result.audioTracks).toHaveLength(1);
  });

  it('revokes probeUrl and proceeds to FFmpeg when canPlayNatively returns false', async () => {
    jest.spyOn(mkvPlayerModule, 'canPlayNatively').mockResolvedValue(false);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:probe-url');
    const revoke = jest.spyOn(URL, 'revokeObjectURL');

    const player = new MKVPlayer(mockFile);
    // Don't await — worker will never respond in this test; just check revoke was called
    player.initialize(mockVideoElement).catch(() => {});

    await Promise.resolve(); // flush microtasks

    expect(revoke).toHaveBeenCalledWith('blob:probe-url');
    expect(workerPostMessage).toHaveBeenCalled();
  });
});
```

---

## Acceptance Criteria

- [ ] `canPlayNatively(objectUrl, timeoutMs?)` is exported from `mkv-player.ts` and accepts a URL string (not a File).
- [ ] `canPlayNatively()` never calls `URL.createObjectURL` or `URL.revokeObjectURL`.
- [ ] `initialize()` creates the probeUrl via `URL.createObjectURL(this.file)` before calling `canPlayNatively`.
- [ ] When native playback works, the probeUrl is kept on `this.objectUrl` and set as `video.src`.
- [ ] When native playback works, `onProgress(1)` is called immediately (no progress bar).
- [ ] When native playback fails, the probeUrl is **revoked** before the FFmpeg/worker path runs.
- [ ] When native playback fails, the existing FFmpeg path runs unchanged.
- [ ] All new tests pass.
