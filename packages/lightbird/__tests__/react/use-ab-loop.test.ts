import { renderHook, act } from "@testing-library/react";
import { useABLoop } from "../../src/react/use-ab-loop";

function makeVideoEl(): HTMLVideoElement {
  const el = document.createElement("video");
  Object.defineProperty(el, "currentTime", { value: 0, writable: true, configurable: true });
  return el;
}

function makeRef(el: HTMLVideoElement | null) {
  return { current: el };
}

describe("useABLoop", () => {
  it("starts with no points set and not looping", () => {
    const { result } = renderHook(() => useABLoop(makeRef(makeVideoEl())));
    expect(result.current.pointA).toBeNull();
    expect(result.current.pointB).toBeNull();
    expect(result.current.isLooping).toBe(false);
  });

  it("setPointA captures the current time as point A", () => {
    const el = makeVideoEl();
    el.currentTime = 30;
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    act(() => result.current.setPointA());
    expect(result.current.pointA).toBe(30);
  });

  it("setPointB captures the current time as B when A is set and B is after A", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());
    expect(result.current.pointB).toBe(50);
    expect(result.current.isLooping).toBe(true);
  });

  it("setPointB is a no-op when point A is not set", () => {
    const el = makeVideoEl();
    el.currentTime = 50;
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    act(() => result.current.setPointB());
    expect(result.current.pointB).toBeNull();
  });

  it("setPointB is a no-op when the current time is not after A", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 40;
    act(() => result.current.setPointA());
    el.currentTime = 20;
    act(() => result.current.setPointB());
    expect(result.current.pointB).toBeNull();
  });

  it("setPointA discards a stale B that is no longer after the new A", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());
    expect(result.current.isLooping).toBe(true);

    el.currentTime = 80;
    act(() => result.current.setPointA());
    expect(result.current.pointA).toBe(80);
    expect(result.current.pointB).toBeNull();
    expect(result.current.isLooping).toBe(false);
  });

  it("clear resets both points", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());
    act(() => result.current.clear());
    expect(result.current.pointA).toBeNull();
    expect(result.current.pointB).toBeNull();
    expect(result.current.isLooping).toBe(false);
  });

  it("jumps back to A when playback reaches B", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());

    el.currentTime = 50;
    act(() => el.dispatchEvent(new Event("timeupdate")));
    expect(el.currentTime).toBe(10);
  });

  it("does not jump while the playhead is within [A, B]", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());

    el.currentTime = 30;
    act(() => el.dispatchEvent(new Event("timeupdate")));
    expect(el.currentTime).toBe(30);
  });

  it("jumps back to A when the playhead is seeked before A", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());

    el.currentTime = 5;
    act(() => el.dispatchEvent(new Event("timeupdate")));
    expect(el.currentTime).toBe(10);
  });

  it("does not enforce the loop while only point A is set", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());

    el.currentTime = 200;
    act(() => el.dispatchEvent(new Event("timeupdate")));
    expect(el.currentTime).toBe(200);
  });

  it("clears the points when a new source loads (loadstart)", () => {
    const el = makeVideoEl();
    const { result } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());
    expect(result.current.isLooping).toBe(true);

    act(() => el.dispatchEvent(new Event("loadstart")));
    expect(result.current.pointA).toBeNull();
    expect(result.current.pointB).toBeNull();
  });

  it("does nothing and does not throw when the video ref is empty", () => {
    const { result } = renderHook(() => useABLoop(makeRef(null)));
    expect(() => act(() => result.current.setPointA())).not.toThrow();
    expect(result.current.pointA).toBeNull();
  });

  it("removes the timeupdate listener on unmount", () => {
    const el = makeVideoEl();
    const removeSpy = jest.spyOn(el, "removeEventListener");
    const { result, unmount } = renderHook(() => useABLoop(makeRef(el)));
    el.currentTime = 10;
    act(() => result.current.setPointA());
    el.currentTime = 50;
    act(() => result.current.setPointB());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("timeupdate", expect.any(Function));
  });
});
