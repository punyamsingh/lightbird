import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "../../src/react/use-fullscreen";

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
  it("falls back to native video fullscreen on Safari and tracks native events", () => {
    const div = document.createElement("div");
    const video = document.createElement("video") as HTMLVideoElement & { webkitEnterFullscreen: jest.Mock; webkitDisplayingFullscreen: boolean; webkitExitFullscreen: jest.Mock };
    video.webkitEnterFullscreen = jest.fn();
    video.webkitExitFullscreen = jest.fn();
    div.append(video);
    const { result } = renderHook(() => useFullscreen({ current: div }));
    expect(result.current.isSupported).toBe(true);
    act(() => result.current.toggle());
    expect(video.webkitEnterFullscreen).toHaveBeenCalled();
    act(() => { video.webkitDisplayingFullscreen = true; video.dispatchEvent(new Event("webkitbeginfullscreen")); });
    expect(result.current.isFullscreen).toBe(true);
    act(() => result.current.toggle());
    expect(video.webkitExitFullscreen).toHaveBeenCalled();
    act(() => { video.webkitDisplayingFullscreen = false; video.dispatchEvent(new Event("webkitendfullscreen")); });
    expect(result.current.isFullscreen).toBe(false);
  });
  it("does not throw when neither fullscreen API exists", () => {
    const { result } = renderHook(() => useFullscreen({ current: document.createElement("div") }));
    expect(result.current.isSupported).toBe(false);
    expect(() => act(() => result.current.toggle())).not.toThrow();
  });

});
