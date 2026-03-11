import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

function makePlayback() {
  return {
    isPlaying: false,
    progress: 30,
    duration: 120,
    volume: 0.8,
    isMuted: false,
    playbackRate: 1,
    loop: false,
    togglePlay: jest.fn(),
    seek: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    setPlaybackRate: jest.fn(),
    frameStep: jest.fn(),
    toggleLoop: jest.fn(),
  };
}

function makeFullscreen() {
  return {
    isFullscreen: false,
    toggle: jest.fn(),
  };
}

function fireKey(code: string, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("Space calls togglePlay", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("Space");
    expect(playback.togglePlay).toHaveBeenCalled();
  });

  it("ArrowRight seeks forward by 5s", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("ArrowRight");
    expect(playback.seek).toHaveBeenCalledWith(35); // 30 + 5
  });

  it("ArrowLeft seeks back by 5s", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("ArrowLeft");
    expect(playback.seek).toHaveBeenCalledWith(25); // 30 - 5
  });

  it("ArrowUp increases volume by 0.1", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("ArrowUp");
    expect(playback.setVolume).toHaveBeenCalledWith(expect.closeTo(0.9, 5));
  });

  it("ArrowDown decreases volume by 0.1", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("ArrowDown");
    expect(playback.setVolume).toHaveBeenCalledWith(expect.closeTo(0.7, 5));
  });

  it("KeyM calls toggleMute", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("KeyM");
    expect(playback.toggleMute).toHaveBeenCalled();
  });

  it("KeyF calls fullscreen toggle", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    fireKey("KeyF");
    expect(fullscreen.toggle).toHaveBeenCalled();
  });

  it("ignores keydown when target is an INPUT element", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", {
      code: "Space",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    window.dispatchEvent(event);
    expect(playback.togglePlay).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("removes event listener on unmount", () => {
    const playback = makePlayback();
    const fullscreen = makeFullscreen();
    const { unmount } = renderHook(() => useKeyboardShortcuts(playback, fullscreen));
    unmount();
    fireKey("Space");
    // After unmount, togglePlay should not have been called
    expect(playback.togglePlay).not.toHaveBeenCalled();
  });
});
