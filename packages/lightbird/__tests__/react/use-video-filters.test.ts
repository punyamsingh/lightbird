import { renderHook, act } from "@testing-library/react";
import { useVideoFilters } from "../../src/react/use-video-filters";

function makeRef() {
  const el = document.createElement("video");
  return { current: el };
}

// Flush pending rAF callbacks queued by the hook
function flushRaf() {
  act(() => {
    jest.runAllTimers();
  });
}

describe("useVideoFilters", () => {
  beforeEach(() => {
    // Use fake timers so rAF callbacks run synchronously via jest.runAllTimers()
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts with default filter values", () => {
    const ref = makeRef();
    const { result } = renderHook(() => useVideoFilters(ref));
    expect(result.current.filters.brightness).toBe(100);
    expect(result.current.filters.contrast).toBe(100);
    expect(result.current.filters.saturate).toBe(100);
    expect(result.current.filters.hue).toBe(0);
    expect(result.current.zoom).toBe(1);
  });

  it("setFilters updates state and applies CSS to video element", () => {
    const ref = makeRef();
    const { result } = renderHook(() => useVideoFilters(ref));
    act(() => result.current.setFilters({ brightness: 150, contrast: 80, saturate: 120, hue: 45 }));
    flushRaf();
    expect(result.current.filters.brightness).toBe(150);
    expect(ref.current.style.filter).toContain("brightness(150%)");
    expect(ref.current.style.filter).toContain("contrast(80%)");
    expect(ref.current.style.filter).toContain("saturate(120%)");
    expect(ref.current.style.filter).toContain("hue-rotate(45deg)");
  });

  it("setZoom updates state and applies transform", () => {
    const ref = makeRef();
    const { result } = renderHook(() => useVideoFilters(ref));
    act(() => result.current.setZoom(1.5));
    flushRaf();
    expect(result.current.zoom).toBe(1.5);
    expect(ref.current.style.transform).toBe("scale(1.5)");
  });

  it("resetFilters restores defaults", () => {
    const ref = makeRef();
    const { result } = renderHook(() => useVideoFilters(ref));
    act(() => {
      result.current.setFilters({ brightness: 200, contrast: 50, saturate: 50, hue: 180 });
      result.current.setZoom(2);
    });
    act(() => result.current.resetFilters());
    expect(result.current.filters.brightness).toBe(100);
    expect(result.current.zoom).toBe(1);
  });

  it("applies filter CSS when video ref is null (no-op)", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useVideoFilters(ref));
    // Should not throw when ref is null
    act(() => result.current.setFilters({ brightness: 150, contrast: 100, saturate: 100, hue: 0 }));
    expect(result.current.filters.brightness).toBe(150);
  });
});
