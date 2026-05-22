import { renderHook, act } from "@testing-library/react";
import {
  useTouchGestures,
  type TouchGestureHandlers,
} from "../../src/react/use-touch-gestures";

// Element is 400px wide (split at x=200) and 300px tall.
function makeTarget(): HTMLElement {
  const el = document.createElement("div");
  jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return el;
}

// jsdom has no TouchEvent constructor — dispatch a plain event with the
// touch lists attached, which is all the hook reads.
function touchEvent(type: string, points: Array<{ clientX: number; clientY: number }>) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "touches", { value: points });
  Object.defineProperty(e, "changedTouches", { value: points });
  return e;
}

function makeHandlers(overrides: Partial<TouchGestureHandlers> = {}): TouchGestureHandlers {
  return {
    seekBy: jest.fn(),
    getVolume: jest.fn(() => 0.5),
    setVolume: jest.fn(),
    getBrightness: jest.fn(() => 0.5),
    setBrightness: jest.fn(),
    ...overrides,
  };
}

const RIGHT = 300;
const LEFT = 100;

describe("useTouchGestures", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function tap(el: HTMLElement, x: number, y: number) {
    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: x, clientY: y }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchend", [{ clientX: x, clientY: y }]));
    });
  }

  it("double-tap on the right half seeks forward", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers, { seekSeconds: 10 }));

    tap(el, RIGHT, 150);
    tap(el, RIGHT, 150);

    expect(handlers.seekBy).toHaveBeenCalledWith(10);
  });

  it("double-tap on the left half seeks backward", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers, { seekSeconds: 10 }));

    tap(el, LEFT, 150);
    tap(el, LEFT, 150);

    expect(handlers.seekBy).toHaveBeenCalledWith(-10);
  });

  it("a single tap does not seek", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers));

    tap(el, RIGHT, 150);

    expect(handlers.seekBy).not.toHaveBeenCalled();
  });

  it("two taps far apart in time are not a double-tap", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers, { doubleTapMs: 300 }));

    tap(el, RIGHT, 150);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    tap(el, RIGHT, 150);

    expect(handlers.seekBy).not.toHaveBeenCalled();
  });

  it("two taps in different halves are not a double-tap", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers));

    tap(el, RIGHT, 150);
    tap(el, LEFT, 150);

    expect(handlers.seekBy).not.toHaveBeenCalled();
  });

  it("exposes seek feedback after a double-tap", () => {
    const el = makeTarget();
    const { result } = renderHook(() =>
      useTouchGestures({ current: el }, makeHandlers(), { seekSeconds: 10 })
    );

    tap(el, RIGHT, 150);
    tap(el, RIGHT, 150);

    expect(result.current.feedback).toEqual({
      type: "seek",
      direction: "forward",
      seconds: 10,
    });
  });

  it("vertical swipe up on the right half raises the volume", () => {
    const el = makeTarget();
    const handlers = makeHandlers({ getVolume: jest.fn(() => 0.5) });
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: RIGHT, clientY: 200 }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: RIGHT, clientY: 50 }]));
    });

    // base 0.5 + 150/300 = 1.0
    const calls = (handlers.setVolume as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][0]).toBeCloseTo(1.0);
  });

  it("vertical swipe down on the right half lowers the volume", () => {
    const el = makeTarget();
    const handlers = makeHandlers({ getVolume: jest.fn(() => 0.8) });
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: RIGHT, clientY: 100 }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: RIGHT, clientY: 250 }]));
    });

    // base 0.8 - 150/300 = 0.3
    const calls = (handlers.setVolume as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBeCloseTo(0.3);
  });

  it("vertical swipe on the left half changes brightness, not volume", () => {
    const el = makeTarget();
    const handlers = makeHandlers({ getBrightness: jest.fn(() => 0.5) });
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: LEFT, clientY: 200 }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: LEFT, clientY: 50 }]));
    });

    const calls = (handlers.setBrightness as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBeCloseTo(1.0);
    expect(handlers.setVolume).not.toHaveBeenCalled();
  });

  it("clamps volume to the 0..1 range", () => {
    const el = makeTarget();
    const handlers = makeHandlers({ getVolume: jest.fn(() => 0.9) });
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: RIGHT, clientY: 280 }]));
    });
    act(() => {
      // A long swipe up that would overshoot 1.0
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: RIGHT, clientY: 0 }]));
    });

    const calls = (handlers.setVolume as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBe(1);
  });

  it("a horizontal swipe does not change volume or brightness", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: RIGHT, clientY: 150 }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: 120, clientY: 160 }]));
    });

    expect(handlers.setVolume).not.toHaveBeenCalled();
    expect(handlers.setBrightness).not.toHaveBeenCalled();
  });

  it("ignores multi-touch gestures", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers));

    act(() => {
      el.dispatchEvent(
        touchEvent("touchstart", [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ])
      );
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: 100, clientY: 40 }]));
    });

    expect(handlers.setVolume).not.toHaveBeenCalled();
    expect(handlers.setBrightness).not.toHaveBeenCalled();
  });

  it("clears feedback after the feedback timeout", () => {
    const el = makeTarget();
    const { result } = renderHook(() =>
      useTouchGestures({ current: el }, makeHandlers(), { feedbackMs: 700 })
    );

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: RIGHT, clientY: 200 }]));
    });
    act(() => {
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: RIGHT, clientY: 100 }]));
    });
    expect(result.current.feedback).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.feedback).toBeNull();
  });

  it("does not attach listeners when disabled", () => {
    const el = makeTarget();
    const handlers = makeHandlers();
    renderHook(() => useTouchGestures({ current: el }, handlers, { enabled: false }));

    tap(el, RIGHT, 150);
    tap(el, RIGHT, 150);

    expect(handlers.seekBy).not.toHaveBeenCalled();
  });

  it("removes touch listeners on unmount", () => {
    const el = makeTarget();
    const removeSpy = jest.spyOn(el, "removeEventListener");
    const { unmount } = renderHook(() => useTouchGestures({ current: el }, makeHandlers()));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
  });

  it("does nothing and does not throw when the target ref is empty", () => {
    const handlers = makeHandlers();
    expect(() =>
      renderHook(() => useTouchGestures({ current: null }, handlers))
    ).not.toThrow();
  });
});
