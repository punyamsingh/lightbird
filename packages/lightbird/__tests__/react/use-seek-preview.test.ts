import { renderHook, act } from "@testing-library/react";

jest.mock("../../src/utils/video-thumbnail", () => ({
  captureFrameAt: jest.fn(),
}));

import { useSeekPreview } from "../../src/react/use-seek-preview";
import { captureFrameAt } from "../../src/utils/video-thumbnail";

const mockCapture = captureFrameAt as jest.MockedFunction<typeof captureFrameAt>;

function makeMainVideo(duration: number = 120, src = "blob:main"): HTMLVideoElement {
  const el = document.createElement("video");
  Object.defineProperty(el, "duration", { value: duration, writable: true, configurable: true });
  Object.defineProperty(el, "currentSrc", { value: src, writable: true, configurable: true });
  return el;
}

// Lets pending debounce timers + the mocked capture promise settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("useSeekPreview", () => {
  beforeEach(() => {
    mockCapture.mockReset();
    mockCapture.mockResolvedValue("data:image/jpeg;base64,FRAME");
  });

  it("reports the hovered time immediately on requestPreview", () => {
    const ref = { current: makeMainVideo(120) };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(42));
    expect(result.current.time).toBe(42);
  });

  it("clamps the hovered time to the video duration", () => {
    const ref = { current: makeMainVideo(60) };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(9999));
    expect(result.current.time).toBe(60);

    act(() => result.current.requestPreview(-10));
    expect(result.current.time).toBe(0);
  });

  it("captures and exposes a thumbnail after the debounce window", async () => {
    const ref = { current: makeMainVideo(120) };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(30));
    await act(async () => {
      await flush();
    });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(result.current.thumbnail).toBe("data:image/jpeg;base64,FRAME");
  });

  it("reuses a cached thumbnail for the same whole-second bucket", async () => {
    const ref = { current: makeMainVideo(120) };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(30.2));
    await act(async () => {
      await flush();
    });
    expect(mockCapture).toHaveBeenCalledTimes(1);

    // Same rounded bucket (30) — should hit the cache, not re-capture.
    act(() => result.current.requestPreview(30.4));
    await act(async () => {
      await flush();
    });
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(result.current.thumbnail).toBe("data:image/jpeg;base64,FRAME");
  });

  it("clearPreview resets the thumbnail and time", async () => {
    const ref = { current: makeMainVideo(120) };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(30));
    await act(async () => {
      await flush();
    });
    expect(result.current.thumbnail).not.toBeNull();

    act(() => result.current.clearPreview());
    expect(result.current.thumbnail).toBeNull();
    expect(result.current.time).toBeNull();
  });

  it("does nothing and does not throw when the video ref is empty", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    expect(() => act(() => result.current.requestPreview(10))).not.toThrow();
    expect(result.current.time).toBeNull();
  });

  it("still reports the hovered time when the duration is unknown", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "duration", { value: NaN, configurable: true });
    Object.defineProperty(el, "currentSrc", { value: "blob:x", configurable: true });
    const ref = { current: el };
    const { result } = renderHook(() => useSeekPreview(ref, { debounceMs: 0 }));

    act(() => result.current.requestPreview(15));
    expect(result.current.time).toBe(15);
    expect(result.current.thumbnail).toBeNull();
  });
});
