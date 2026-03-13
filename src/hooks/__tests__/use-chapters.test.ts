import { renderHook, act } from "@testing-library/react";
import { useChapters } from "../use-chapters";
import type { Chapter } from "@/types";
import type { VideoPlayer } from "@/lib/video-processor";

const mockChapters: Chapter[] = [
  { index: 0, title: "Introduction", startTime: 0, endTime: 142.5 },
  { index: 1, title: "Act 1", startTime: 142.5, endTime: 300 },
  { index: 2, title: "Credits", startTime: 300, endTime: 600 },
];

function makeVideoRef(initialTime = 0) {
  const el = document.createElement("video");
  Object.defineProperty(el, "currentTime", { value: initialTime, writable: true });
  return { current: el };
}

function makePlayerRef(chapters: Chapter[]): { current: VideoPlayer | null } {
  return {
    current: {
      initialize: jest.fn(),
      getAudioTracks: jest.fn().mockReturnValue([]),
      getSubtitles: jest.fn().mockReturnValue([]),
      getChapters: jest.fn().mockReturnValue(chapters),
      switchAudioTrack: jest.fn(),
      switchSubtitle: jest.fn(),
      destroy: jest.fn(),
    },
  };
}

function makeEmptyPlayerRef(): { current: VideoPlayer | null } {
  return {
    current: {
      initialize: jest.fn(),
      getAudioTracks: jest.fn().mockReturnValue([]),
      getSubtitles: jest.fn().mockReturnValue([]),
      // getChapters is intentionally absent to test the optional case
      switchAudioTrack: jest.fn(),
      switchSubtitle: jest.fn(),
      destroy: jest.fn(),
    },
  };
}

describe("useChapters", () => {
  it("returns empty chapters when player has no getChapters method", () => {
    const videoRef = makeVideoRef();
    const playerRef = makeEmptyPlayerRef();
    const { result } = renderHook(() => useChapters(videoRef, playerRef));
    expect(result.current.chapters).toEqual([]);
  });

  it("returns empty chapters when playerRef.current is null", () => {
    const videoRef = makeVideoRef();
    const playerRef: { current: VideoPlayer | null } = { current: null };
    const { result } = renderHook(() => useChapters(videoRef, playerRef));
    expect(result.current.chapters).toEqual([]);
  });

  it("populates chapters from playerRef on mount", () => {
    const videoRef = makeVideoRef();
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));
    expect(result.current.chapters).toEqual(mockChapters);
  });

  it("currentChapter is null initially before timeupdate fires", () => {
    const videoRef = makeVideoRef();
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));
    expect(result.current.currentChapter).toBeNull();
  });

  it("currentChapter updates when timeupdate fires at t=0 → Introduction", () => {
    const videoRef = makeVideoRef(0);
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));

    act(() => {
      videoRef.current.currentTime = 10;
      videoRef.current.dispatchEvent(new Event("timeupdate"));
    });

    expect(result.current.currentChapter?.title).toBe("Introduction");
  });

  it("currentChapter updates when timeupdate fires in Act 1", () => {
    const videoRef = makeVideoRef(0);
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));

    act(() => {
      videoRef.current.currentTime = 200;
      videoRef.current.dispatchEvent(new Event("timeupdate"));
    });

    expect(result.current.currentChapter?.title).toBe("Act 1");
  });

  it("goToChapter sets currentTime on the video element", () => {
    const videoRef = makeVideoRef(0);
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));

    act(() => {
      result.current.goToChapter(1);
    });

    expect(videoRef.current.currentTime).toBe(142.5);
  });

  it("goToChapter is a no-op for an out-of-range index", () => {
    const videoRef = makeVideoRef(0);
    const playerRef = makePlayerRef(mockChapters);
    const { result } = renderHook(() => useChapters(videoRef, playerRef));

    act(() => {
      result.current.goToChapter(99);
    });

    expect(videoRef.current.currentTime).toBe(0);
  });
});
