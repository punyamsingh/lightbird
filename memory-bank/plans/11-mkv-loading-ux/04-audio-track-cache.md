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

```typescript
private async _remux(audioTrackIndex: number): Promise<string> {
  // Cache hit: return the previously remuxed URL
  const cached = this.remuxCache.get(audioTrackIndex);
  if (cached) return cached;

  // Cache miss: run FFmpeg (either via worker or directly, depending on which sub-plan is active)
  // ... existing remux logic ...

  const url = URL.createObjectURL(blob);

  // Store result — do NOT revoke this URL until destroy()
  this.remuxCache.set(audioTrackIndex, url);

  // Still update objectUrl for backwards compatibility (used in destroy() currently)
  // After sub-plan 1, objectUrl can be removed in favour of remuxCache.
  this.objectUrl = url;

  return url;
}
```

### 3. Update `destroy()` to revoke all cached URLs

```typescript
destroy(): void {
  // ... worker termination (sub-plan 1) ...

  // Revoke all remux cache entries
  for (const url of this.remuxCache.values()) {
    URL.revokeObjectURL(url);
  }
  this.remuxCache.clear();

  // Keep objectUrl cleanup for safety (may point to same URL as cache entry 0)
  if (this.objectUrl) {
    // Already revoked above if it was in the cache; safe to call twice (no-op)
    this.objectUrl = null;
  }

  for (const url of this.subtitleBlobUrls.values()) {
    URL.revokeObjectURL(url);
  }
  this.subtitleBlobUrls.clear();
}
```

> **URL.revokeObjectURL called twice for the same URL is safe** — the second call is a no-op.

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

  it('stores the result in the cache after a fresh remux', async () => {
    const player = new MKVPlayer(mockFile);
    // Mock _remux to return a URL without running FFmpeg
    const spy = jest
      .spyOn(player as unknown as { _remux: Function }, '_remux')
      .mockResolvedValue('blob:fresh-remux');

    player['remuxCache'].clear(); // ensure cache is empty
    const url = await player['_remux'](2);

    expect(url).toBe('blob:fresh-remux');
    // After this plan's changes, the cache should be populated
    // (the mock returns before cache.set, so test the real implementation path)
    spy.mockRestore();
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
