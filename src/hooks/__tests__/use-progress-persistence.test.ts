import { renderHook, act } from "@testing-library/react";
import { useProgressPersistence } from "../use-progress-persistence";

describe("useProgressPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("restores saved position when video name is provided", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 0, writable: true });
    localStorage.setItem("lightbirdplayer-movie.mp4", "42.5");
    const ref = { current: el };
    renderHook(() => useProgressPersistence(ref, "movie.mp4"));
    expect(el.currentTime).toBe(42.5);
  });

  it("does not restore if no saved position", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 0, writable: true });
    const ref = { current: el };
    renderHook(() => useProgressPersistence(ref, "other.mp4"));
    expect(el.currentTime).toBe(0);
  });

  it("does not restore when video name is null", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 0, writable: true });
    localStorage.setItem("lightbirdplayer-null", "10");
    const ref = { current: el };
    renderHook(() => useProgressPersistence(ref, null));
    expect(el.currentTime).toBe(0);
  });

  it("saves position to localStorage after debounce fires", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 60, writable: true });
    const ref = { current: el };
    renderHook(() => useProgressPersistence(ref, "movie.mp4"));

    act(() => { el.dispatchEvent(new Event("timeupdate")); });

    // Not saved yet before debounce fires
    expect(localStorage.getItem("lightbirdplayer-movie.mp4")).toBeNull();

    act(() => { jest.advanceTimersByTime(5000); });

    expect(localStorage.getItem("lightbirdplayer-movie.mp4")).toBe("60");
  });

  it("flushes pending position to localStorage on cleanup (unmount/video switch)", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 75, writable: true });
    const ref = { current: el };
    const { unmount } = renderHook(() => useProgressPersistence(ref, "movie.mp4"));

    act(() => { el.dispatchEvent(new Event("timeupdate")); });

    // Still within debounce window — not saved yet
    act(() => { jest.advanceTimersByTime(1000); });
    expect(localStorage.getItem("lightbirdplayer-movie.mp4")).toBeNull();

    // Unmount flushes immediately
    unmount();
    expect(localStorage.getItem("lightbirdplayer-movie.mp4")).toBe("75");
  });

  it("debounces — only saves once after multiple timeupdate events", () => {
    const el = document.createElement("video");
    Object.defineProperty(el, "currentTime", { value: 0, writable: true });
    const ref = { current: el };
    renderHook(() => useProgressPersistence(ref, "movie.mp4"));

    act(() => {
      for (let i = 0; i < 5; i++) {
        el.currentTime = i * 10;
        el.dispatchEvent(new Event("timeupdate"));
        jest.advanceTimersByTime(1000);
      }
    });

    // Advance past the debounce window
    act(() => jest.advanceTimersByTime(5000));

    // Should be saved with the last currentTime value
    const saved = localStorage.getItem("lightbirdplayer-movie.mp4");
    expect(saved).toBe("40");
  });
});
