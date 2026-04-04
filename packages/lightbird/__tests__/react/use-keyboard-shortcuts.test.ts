import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../../src/react/use-keyboard-shortcuts";
import { DEFAULT_SHORTCUTS } from "../../src/utils/keyboard-shortcuts";
import type { ShortcutHandlers } from "../../src/react/use-keyboard-shortcuts";

function makeHandlers(): ShortcutHandlers {
  return {
    "play-pause": jest.fn(),
    "seek-forward-5": jest.fn(),
    "seek-backward-5": jest.fn(),
    "seek-forward-30": jest.fn(),
    "seek-backward-30": jest.fn(),
    "volume-up": jest.fn(),
    "volume-down": jest.fn(),
    mute: jest.fn(),
    fullscreen: jest.fn(),
    "next-item": jest.fn(),
    "prev-item": jest.fn(),
    screenshot: jest.fn(),
    "show-shortcuts": jest.fn(),
  };
}

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("Space triggers play-pause", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey(" ");
    expect(handlers["play-pause"]).toHaveBeenCalled();
  });

  it("ArrowRight triggers seek-forward-5", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowRight");
    expect(handlers["seek-forward-5"]).toHaveBeenCalled();
  });

  it("ArrowLeft triggers seek-backward-5", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowLeft");
    expect(handlers["seek-backward-5"]).toHaveBeenCalled();
  });

  it("Shift+ArrowRight triggers seek-forward-30", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowRight", { shiftKey: true });
    expect(handlers["seek-forward-30"]).toHaveBeenCalled();
    expect(handlers["seek-forward-5"]).not.toHaveBeenCalled();
  });

  it("Shift+ArrowLeft triggers seek-backward-30", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowLeft", { shiftKey: true });
    expect(handlers["seek-backward-30"]).toHaveBeenCalled();
    expect(handlers["seek-backward-5"]).not.toHaveBeenCalled();
  });

  it("ArrowUp triggers volume-up", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowUp");
    expect(handlers["volume-up"]).toHaveBeenCalled();
  });

  it("ArrowDown triggers volume-down", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("ArrowDown");
    expect(handlers["volume-down"]).toHaveBeenCalled();
  });

  it("m triggers mute", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("m");
    expect(handlers.mute).toHaveBeenCalled();
  });

  it("f triggers fullscreen", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("f");
    expect(handlers.fullscreen).toHaveBeenCalled();
  });

  it("? triggers show-shortcuts", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    fireKey("?");
    expect(handlers["show-shortcuts"]).toHaveBeenCalled();
  });

  it("ignores keydown when activeElement is an INPUT", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireKey(" ");
    expect(handlers["play-pause"]).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores keydown when activeElement is a TEXTAREA", () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers));
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    fireKey(" ");
    expect(handlers["play-pause"]).not.toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it("removes event listener on unmount", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts(DEFAULT_SHORTCUTS, handlers)
    );
    unmount();
    fireKey(" ");
    expect(handlers["play-pause"]).not.toHaveBeenCalled();
  });

  it("uses custom shortcuts when provided", () => {
    const handlers = makeHandlers();
    const customShortcuts = DEFAULT_SHORTCUTS.map((s) =>
      s.action === "play-pause" ? { ...s, key: "k" } : s
    );
    renderHook(() => useKeyboardShortcuts(customShortcuts, handlers));
    fireKey("k");
    expect(handlers["play-pause"]).toHaveBeenCalled();
    // Space should no longer trigger play-pause
    fireKey(" ");
    expect(handlers["play-pause"]).toHaveBeenCalledTimes(1);
  });
});
