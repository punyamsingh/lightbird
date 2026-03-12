# Sub-plan 04 — Audio Track Remux Cache

## Status: PENDING

## Independent Of Sub-plans 1–3

This plan modifies `_remux()` and `destroy()` only. It works whether FFmpeg runs on the
main thread (current) or in a worker (sub-plan 1). Implement after sub-plan 1 to avoid
merge conflicts, but the logic is self-contained.

---

## Problem

Switching audio tracks always re-remuxes the entire file with FFmpeg. If the user switches
from track 0 → 1 → 0, FFmpeg runs twice for track 0 and once for track 1, even though the
first remux result for track 0 was already valid and available.

---

## Goal

Cache the `objectURL` result of each remux by audio track index. A cache hit returns
instantly (no FFmpeg). A cache miss runs FFmpeg and stores the result.

---

## Changes to `MKVPlayer`

### 1. Add the cache field

```typescript
// Maps audioTrackIndex → blob URL of the remuxed video
private remuxCache: Map<number, string> = new Map();
```

### 2. Update `_remux()` to check cache first

**Critical:** Sub-plan 01's `_remux()` contains the line:
```typescript
if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
```
**Delete that line.** Once the cache is in place, `this.objectUrl` may point to a URL
that is also stored in `remuxCache`. Revoking it here would silently break any future
cache hit for that track index. All revocations are moved exclusively to `destroy()`.

```typescript
private async _remux(audioTrackIndex: number): Promise<string> {
  // Cache hit: return the previously remuxed URL instantly (no FFmpeg)
  const cached = this.remuxCache.get(audioTrackIndex);
  if (cached) return cached;

  // Cache miss: run FFmpeg via worker (sub-plan 01)
  // ... existing sendToWorker(REMUX) call ...

  const blob = new Blob([result.data], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  // Store in cache — revocation happens only in destroy()
  this.remuxCache.set(audioTrackIndex, url);
  this.objectUrl = url; // keep for destroy() fallback

  return url;
}
```

> **Memory note:** The cache accumulates one blob URL per unique audio track index
> and holds them until `destroy()`. For typical files (1–3 tracks) this is negligible.
> Files with many audio tracks could accumulate more; a bounded cache is a future
> optimisation if needed.

### 3. Update `destroy()` to revoke all cached URLs

```typescript
destroy(): void {
  // ... worker termination (sub-plan 1) ...

  // Revoke all remux cache entries
  for (const url of this.remuxCache.values()) {
    URL.revokeObjectURL(url);
  }
  this.remuxCache.clear();

  // Also revoke objectUrl explicitly (handles native fallback URL from sub-plan 05
  // which is stored in this.objectUrl but NOT in remuxCache)
  if (this.objectUrl) {
    URL.revokeObjectURL(this.objectUrl); // safe to call twice — second call is a no-op
    this.objectUrl = null;
  }

  for (const url of this.subtitleBlobUrls.values()) {
    URL.revokeObjectURL(url);
  }
  this.subtitleBlobUrls.clear();
}
```

---

## Tests to Add in `src/lib/__tests__/mkv-player.test.ts`

```typescript
describe('MKVPlayer remux cache', () => {
  it('does not call remux again when switching back to a cached track', async () => {
    const player = new MKVPlayer(mockFile);
    // Inject the cache directly (avoids needing a live FFmpeg)
    player['remuxCache'].set(0, 'blob:cached-track-0');
    player['videoElement'] = mockVideoElement;
    player['playerFile'].activeAudioTrack = '1'; // pretend we're on track 1

    await player.switchAudioTrack('0');

    // Should NOT have called the worker / FFmpeg
    // The video element src should be the cached URL
    expect(mockVideoElement.src).toBe('blob:cached-track-0');
  });

  it('stores the result in remuxCache after a fresh remux', async () => {
    const postMessage = jest.fn();
    const mockWorker = { postMessage, terminate: jest.fn(), onmessage: null, onerror: null };
    jest.spyOn(global, 'Worker').mockImplementation(() => mockWorker as unknown as Worker);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fresh-track-2');

    const player = new MKVPlayer(mockFile);
    player['remuxCache'].clear();

    // Spy on remuxCache.set to assert it is called with the right key/value
    const cacheSpy = jest.spyOn(player['remuxCache'], 'set');

    // Start _remux without awaiting — resolve the worker message manually
    const remuxPromise = player['_remux'](2);

    // Simulate worker REMUX_DONE response
    const msg = postMessage.mock.calls[0][0];
    mockWorker.onmessage?.({
      data: { id: msg.id, type: 'REMUX_DONE', data: new Uint8Array([0]), logs: '' },
    });

    await remuxPromise;

    expect(cacheSpy).toHaveBeenCalledWith(2, 'blob:fresh-track-2');
    cacheSpy.mockRestore();
  });

  it('revokes all cached URLs on destroy()', () => {
    const revoke = jest.spyOn(URL, 'revokeObjectURL');
    const player = new MKVPlayer(mockFile);
    player['remuxCache'].set(0, 'blob:track-0');
    player['remuxCache'].set(1, 'blob:track-1');

    player.destroy();

    expect(revoke).toHaveBeenCalledWith('blob:track-0');
    expect(revoke).toHaveBeenCalledWith('blob:track-1');
  });
});
```

---

## Acceptance Criteria

- [ ] `remuxCache: Map<number, string>` field exists on `MKVPlayer`.
- [ ] `_remux(n)` returns the cached URL on the second call with the same `n`.
- [ ] `_remux(n)` only calls FFmpeg once per unique `n`.
- [ ] `destroy()` calls `URL.revokeObjectURL` for every entry in `remuxCache`.
- [ ] All new tests pass.
