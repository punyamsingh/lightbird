import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "../use-fullscreen";

describe("useFullscreen", () => {
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(
    document,
    "fullscreenElement"
  );

  beforeEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
    document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalFullscreenElement) {
      Object.defineProperty(document, "fullscreenElement", originalFullscreenElement);
    }
    jest.restoreAllMocks();
  });

  it("starts with isFullscreen false", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.isFullscreen).toBe(false);
  });

  it("toggle calls requestFullscreen when not in fullscreen", () => {
    const div = document.createElement("div");
    div.requestFullscreen = jest.fn().mockResolvedValue(undefined);
    const ref = { current: div };
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => result.current.toggle());
    expect(div.requestFullscreen).toHaveBeenCalled();
  });

  it("toggle calls exitFullscreen when already in fullscreen", () => {
    Object.defineProperty(document, "fullscreenElement", {
      value: document.createElement("div"),
      writable: true,
      configurable: true,
    });
    const div = document.createElement("div");
    const ref = { current: div };
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => result.current.toggle());
    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it("isFullscreen updates on fullscreenchange event", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        value: document.createElement("div"),
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.isFullscreen).toBe(true);

    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.isFullscreen).toBe(false);
  });

  it("does nothing when ref is null", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useFullscreen(ref));
    // Should not throw
    act(() => result.current.toggle());
  });
});
