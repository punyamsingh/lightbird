import {
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  saveShortcuts,
  matchesShortcut,
  isInteractiveElement,
  formatShortcutKey,
} from "@/lib/keyboard-shortcuts";
import type { ShortcutBinding } from "@/lib/keyboard-shortcuts";

const STORAGE_KEY = "lightbird-shortcuts";

function makeKeyEvent(
  key: string,
  opts: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...opts });
}

describe("DEFAULT_SHORTCUTS", () => {
  it("contains 15 bindings", () => {
    expect(DEFAULT_SHORTCUTS).toHaveLength(15);
  });

  it("every binding has an action, label, defaultKey and key", () => {
    for (const b of DEFAULT_SHORTCUTS) {
      expect(b.action).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(b.defaultKey).toBeDefined();
      expect(b.key).toBeDefined();
    }
  });

  it("defaultKey and key are identical out of the box", () => {
    for (const b of DEFAULT_SHORTCUTS) {
      expect(b.key).toBe(b.defaultKey);
    }
  });
});

describe("matchesShortcut", () => {
  it("matches a plain key", () => {
    const binding = DEFAULT_SHORTCUTS.find((b) => b.action === "play-pause")!;
    const e = makeKeyEvent(" ");
    expect(matchesShortcut(e, binding)).toBe(true);
  });

  it("does not match wrong key", () => {
    const binding = DEFAULT_SHORTCUTS.find((b) => b.action === "play-pause")!;
    const e = makeKeyEvent("x");
    expect(matchesShortcut(e, binding)).toBe(false);
  });

  it("matches shift+ArrowRight for seek-forward-30", () => {
    const binding = DEFAULT_SHORTCUTS.find(
      (b) => b.action === "seek-forward-30"
    )!;
    const e = makeKeyEvent("ArrowRight", { shiftKey: true });
    expect(matchesShortcut(e, binding)).toBe(true);
  });

  it("does NOT match shift+ArrowRight for seek-forward-5 (no modifier)", () => {
    const binding = DEFAULT_SHORTCUTS.find(
      (b) => b.action === "seek-forward-5"
    )!;
    const e = makeKeyEvent("ArrowRight", { shiftKey: true });
    expect(matchesShortcut(e, binding)).toBe(false);
  });

  it("does NOT match ArrowRight without shift for seek-forward-30", () => {
    const binding = DEFAULT_SHORTCUTS.find(
      (b) => b.action === "seek-forward-30"
    )!;
    const e = makeKeyEvent("ArrowRight");
    expect(matchesShortcut(e, binding)).toBe(false);
  });

  it("is case-insensitive for letter keys", () => {
    const binding = DEFAULT_SHORTCUTS.find((b) => b.action === "mute")!;
    const eUpper = makeKeyEvent("M");
    const eLower = makeKeyEvent("m");
    // Both uppercase and lowercase key events match the 'm' binding
    expect(matchesShortcut(eLower, binding)).toBe(true);
    expect(matchesShortcut(eUpper, binding)).toBe(true);
  });
});

describe("isInteractiveElement", () => {
  it("returns true for INPUT", () => {
    const el = document.createElement("input");
    expect(isInteractiveElement(el)).toBe(true);
  });

  it("returns true for TEXTAREA", () => {
    const el = document.createElement("textarea");
    expect(isInteractiveElement(el)).toBe(true);
  });

  it("returns true for SELECT", () => {
    const el = document.createElement("select");
    expect(isInteractiveElement(el)).toBe(true);
  });

  it("returns true for BUTTON", () => {
    const el = document.createElement("button");
    expect(isInteractiveElement(el)).toBe(true);
  });

  it("returns true for contentEditable element", () => {
    const el = document.createElement("div");
    el.contentEditable = "true";
    expect(isInteractiveElement(el)).toBe(true);
  });

  it("returns false for plain DIV", () => {
    const el = document.createElement("div");
    expect(isInteractiveElement(el)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isInteractiveElement(null)).toBe(false);
  });
});

describe("formatShortcutKey", () => {
  it("formats a plain key", () => {
    const b: ShortcutBinding = {
      action: "mute",
      label: "Mute",
      defaultKey: "m",
      key: "m",
    };
    expect(formatShortcutKey(b)).toBe("m");
  });

  it("formats Space as 'Space'", () => {
    const b: ShortcutBinding = {
      action: "play-pause",
      label: "Play",
      defaultKey: " ",
      key: " ",
    };
    expect(formatShortcutKey(b)).toBe("Space");
  });

  it("includes modifiers", () => {
    const b: ShortcutBinding = {
      action: "screenshot",
      label: "Screenshot",
      defaultKey: "s",
      key: "s",
      modifiers: { ctrl: true },
    };
    expect(formatShortcutKey(b)).toBe("Ctrl + s");
  });
});

describe("loadShortcuts / saveShortcuts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns DEFAULT_SHORTCUTS when nothing saved", () => {
    const loaded = loadShortcuts();
    expect(loaded).toEqual(DEFAULT_SHORTCUTS);
  });

  it("applies saved overrides", () => {
    const overrides = { "play-pause": "k" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    const loaded = loadShortcuts();
    const playPause = loaded.find((b) => b.action === "play-pause")!;
    expect(playPause.key).toBe("k");
    // Other bindings unchanged
    const mute = loaded.find((b) => b.action === "mute")!;
    expect(mute.key).toBe("m");
  });

  it("saveShortcuts persists only non-default bindings", () => {
    const bindings = DEFAULT_SHORTCUTS.map((b) =>
      b.action === "mute" ? { ...b, key: "u" } : b
    );
    saveShortcuts(bindings);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved).toEqual({ mute: "u" });
  });

  it("saveShortcuts stores nothing when all keys are defaults", () => {
    saveShortcuts(DEFAULT_SHORTCUTS);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved).toEqual({});
  });

  it("returns DEFAULT_SHORTCUTS on malformed storage data", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json");
    const loaded = loadShortcuts();
    expect(loaded).toEqual(DEFAULT_SHORTCUTS);
  });
});
