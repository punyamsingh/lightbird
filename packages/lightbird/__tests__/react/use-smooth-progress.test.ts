import { renderHook, act } from "@testing-library/react";
import { useSmoothProgress } from "../../src/react/use-smooth-progress";

function makeVideoEl(initial = 0): HTMLVideoElement {
  const el = document.createElement("video");
  let currentTime = initial;
  Object.defineProperty(el, "currentTime", {
    get: () => currentTime,
    set: (v: number) => {
      currentTime = v;
    },
    configurable: true,
  });
  return el;
}

// rAF in jsdom defaults to a setTimeout polyfill we don't control directly,
// so install a deterministic shim that fires synchronously when we ask it to.
function installRafShim() {
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();
  const raf = (cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  const caf = (id: number) => {
    queue.delete(id);
  };
  (global as unknown as { requestAnimationFrame: typeof raf }).requestAnimationFrame = raf;
  (global as unknown as { cancelAnimationFrame: typeof caf }).cancelAnimationFrame = caf;
  return {
    flushFrame() {
      const entries = [...queue.entries()];
      queue.clear();
      let t = 0;
      for (const [, cb] of entries) cb(t++);
    },
    pending() {
      return queue.size;
    },
  };
}

describe("useSmoothProgress", () => {
  let raf: ReturnType<typeof installRafShim>;

  beforeEach(() => {
    raf = installRafShim();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  it("returns the fallback when no video element is attached", () => {
    const ref = { current: null };
    const { result } = renderHook(() =>
      useSmoothProgress(ref, { isPlaying: true, fallback: 7 })
    );
    expect(result.current).toBe(7);
  });

  it("returns the element's current time when paused", () => {
    const el = makeVideoEl(42);
    const ref = { current: el };
    const { result } = renderHook(() =>
      useSmoothProgress(ref, { isPlaying: false })
    );
    expect(result.current).toBe(42);
    // No rAF scheduled while paused
    expect(raf.pending()).toBe(0);
  });

  it("schedules a rAF loop while playing and updates with currentTime", () => {
    const el = makeVideoEl(0);
    const ref = { current: el };
    const { result } = renderHook(() =>
      useSmoothProgress(ref, { isPlaying: true })
    );

    expect(raf.pending()).toBe(1);

    el.currentTime = 5;
    act(() => raf.flushFrame());
    expect(result.current).toBe(5);

    el.currentTime = 10.25;
    act(() => raf.flushFrame());
    expect(result.current).toBe(10.25);

    // Still scheduled for the next frame.
    expect(raf.pending()).toBe(1);
  });

  it("stops the loop when isPlaying flips to false", () => {
    const el = makeVideoEl(0);
    const ref = { current: el };
    const { result, rerender } = renderHook(
      ({ playing }: { playing: boolean }) =>
        useSmoothProgress(ref, { isPlaying: playing }),
      { initialProps: { playing: true } }
    );

    expect(raf.pending()).toBe(1);
    el.currentTime = 3;
    act(() => raf.flushFrame());
    expect(result.current).toBe(3);

    rerender({ playing: false });
    expect(raf.pending()).toBe(0);
    // Hook snapped to the element's currentTime when the loop stopped.
    expect(result.current).toBe(3);
  });

  it("cancels the rAF loop on unmount", () => {
    const el = makeVideoEl(0);
    const ref = { current: el };
    const { unmount } = renderHook(() =>
      useSmoothProgress(ref, { isPlaying: true })
    );
    expect(raf.pending()).toBe(1);
    unmount();
    expect(raf.pending()).toBe(0);
  });

  it("stops ticking when the tab becomes hidden and resumes when visible", () => {
    const el = makeVideoEl(0);
    const ref = { current: el };
    const { result } = renderHook(() =>
      useSmoothProgress(ref, { isPlaying: true })
    );

    expect(raf.pending()).toBe(1);
    el.currentTime = 4;
    act(() => raf.flushFrame());
    expect(result.current).toBe(4);

    // Tab hidden — pending frame fires once, then loop stops because the
    // visibility handler cancels it. Use the event to drive that path.
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(raf.pending()).toBe(0);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(raf.pending()).toBe(1);
  });
});
