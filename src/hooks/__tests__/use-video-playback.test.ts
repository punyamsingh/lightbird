import { renderHook, act } from "@testing-library/react";
import { useVideoPlayback } from "../use-video-playback";

function makeVideoEl() {
  const el = document.createElement("video");
  el.play = jest.fn().mockResolvedValue(undefined);
  el.pause = jest.fn();
  Object.defineProperty(el, "duration", { value: 120, writable: true });
  Object.defineProperty(el, "currentTime", { value: 0, writable: true });
  Object.defineProperty(el, "volume", { value: 1, writable: true });
  Object.defineProperty(el, "muted", { value: false, writable: true });
  Object.defineProperty(el, "paused", { get: () => !el._playing, configurable: true });
  (el as any)._playing = false;
  return el;
}

function makeRef(el: HTMLVideoElement) {
  return { current: el };
}

describe("useVideoPlayback", () => {
  it("initial state is correct", () => {
    const ref = makeRef(makeVideoEl());
    const { result } = renderHook(() => useVideoPlayback(ref));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.volume).toBe(1);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.playbackRate).toBe(1);
    expect(result.current.loop).toBe(false);
  });

  it("toggleLoop flips loop state", () => {
    const ref = makeRef(makeVideoEl());
    const { result } = renderHook(() => useVideoPlayback(ref));
    act(() => result.current.toggleLoop());
    expect(result.current.loop).toBe(true);
    act(() => result.current.toggleLoop());
    expect(result.current.loop).toBe(false);
  });

  it("setPlaybackRate updates state and video element", () => {
    const el = makeVideoEl();
    Object.defineProperty(el, "playbackRate", { value: 1, writable: true });
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));
    act(() => result.current.setPlaybackRate(2));
    expect(result.current.playbackRate).toBe(2);
    expect(el.playbackRate).toBe(2);
  });

  it("seek clamps to valid range", () => {
    const el = makeVideoEl();
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));
    act(() => result.current.seek(-10));
    expect(el.currentTime).toBe(0);
    act(() => result.current.seek(9999));
    expect(el.currentTime).toBe(120);
  });

  it("updates isPlaying on play/pause events", () => {
    const el = makeVideoEl();
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));

    act(() => el.dispatchEvent(new Event("play")));
    expect(result.current.isPlaying).toBe(true);

    act(() => el.dispatchEvent(new Event("pause")));
    expect(result.current.isPlaying).toBe(false);
  });

  it("updates duration on loadedmetadata event", () => {
    const el = makeVideoEl();
    Object.defineProperty(el, "duration", { value: 300, writable: true });
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));

    act(() => el.dispatchEvent(new Event("loadedmetadata")));
    expect(result.current.duration).toBe(300);
  });

  it("updates progress on timeupdate event", () => {
    const el = makeVideoEl();
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));

    el.currentTime = 45;
    act(() => el.dispatchEvent(new Event("timeupdate")));
    expect(result.current.progress).toBe(45);
  });

  it("setVolume updates video element", () => {
    const el = makeVideoEl();
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));
    act(() => result.current.setVolume(0.5));
    expect(el.volume).toBe(0.5);
  });

  it("toggleMute toggles muted state on video element", () => {
    const el = makeVideoEl();
    el.muted = false;
    const ref = makeRef(el);
    const { result } = renderHook(() => useVideoPlayback(ref));
    act(() => result.current.toggleMute());
    expect(el.muted).toBe(true);
    act(() => result.current.toggleMute());
    expect(el.muted).toBe(false);
  });
});
