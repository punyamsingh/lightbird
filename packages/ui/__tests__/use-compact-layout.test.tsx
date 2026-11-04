import { act, renderHook } from '@testing-library/react';
import { useCompactLayout } from '../src/hooks/use-compact-layout';

describe('container layout', () => {
  it('reacts to embed resizes independently of the browser width and cleans up', () => {
    const element = document.createElement('div');
    let width = 390;
    jest.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({ width } as DOMRect));
    let notify: ResizeObserverCallback = () => {};
    const disconnect = jest.fn();
    const OriginalObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) { notify = callback; }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = disconnect;
    };
    try {
      const ref = { current: element };
      const { result, unmount } = renderHook(() => useCompactLayout(ref));
      expect(result.current).toBe(true);
      act(() => { width = 1200; notify([], {} as ResizeObserver); });
      expect(result.current).toBe(false);
      act(() => { width = 768; notify([], {} as ResizeObserver); });
      expect(result.current).toBe(true);
      unmount();
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      global.ResizeObserver = OriginalObserver;
    }
  });
});
