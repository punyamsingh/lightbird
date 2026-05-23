import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SeekBar from '../src/seek-bar';
import { TooltipProvider } from '../src/primitives/tooltip';
import type { Chapter } from '@lightbird/core';

const wrap = (ui: React.ReactElement) => <TooltipProvider>{ui}</TooltipProvider>;

function installRafShim() {
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();
  const raf = (cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  const caf = (id: number) => {
    queue.delete(id);
  };
  (global as unknown as { requestAnimationFrame: typeof raf }).requestAnimationFrame = raf;
  (global as unknown as { cancelAnimationFrame: typeof caf }).cancelAnimationFrame = caf;
  return {
    flushFrame() {
      const entries = [...queue.entries()];
      queue.clear();
      let t = 0;
      for (const [, cb] of entries) cb(t++);
    },
    pending() {
      return queue.size;
    },
  };
}

function makeVideo(currentTime = 0): HTMLVideoElement {
  const el = document.createElement('video');
  let t = currentTime;
  Object.defineProperty(el, 'currentTime', {
    get: () => t,
    set: (v: number) => {
      t = v;
    },
    configurable: true,
  });
  return el;
}

function mockRect(el: HTMLElement, width = 100) {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width,
    top: 0,
    height: 16,
    right: width,
    bottom: 16,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

const chapters: Chapter[] = [
  { index: 0, title: 'Intro', startTime: 0, endTime: 30 },
  { index: 1, title: 'Mid', startTime: 30, endTime: 60 },
  { index: 2, title: 'End', startTime: 60, endTime: 100 },
];

describe('SeekBar — fallback (no videoRef)', () => {
  it('renders without crashing and reflects the progress prop on the slider', () => {
    render(wrap(
      <SeekBar progress={42} duration={100} isPlaying={false} onSeek={jest.fn()} />,
    ));
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders n-1 chapter ticks for n chapters (skips the first)', () => {
    render(wrap(
      <SeekBar
        progress={0}
        duration={100}
        isPlaying={false}
        onSeek={jest.fn()}
        chapters={chapters}
      />,
    ));
    expect(screen.getAllByTestId('chapter-tick')).toHaveLength(2);
  });

  it('positions chapter ticks at the correct percentage', () => {
    render(wrap(
      <SeekBar
        progress={0}
        duration={100}
        isPlaying={false}
        onSeek={jest.fn()}
        chapters={chapters}
      />,
    ));
    const ticks = screen.getAllByTestId('chapter-tick');
    expect(ticks[0]).toHaveStyle({ left: '30%' });
    expect(ticks[1]).toHaveStyle({ left: '60%' });
  });

  it('renders the A-B loop region and markers when both points are set', () => {
    render(wrap(
      <SeekBar
        progress={0}
        duration={200}
        isPlaying={false}
        onSeek={jest.fn()}
        abLoop={{ pointA: 50, pointB: 150, isLooping: true }}
      />,
    ));
    expect(screen.getByTestId('ab-marker-a')).toHaveStyle({ left: '25%' });
    expect(screen.getByTestId('ab-marker-b')).toHaveStyle({ left: '75%' });
    expect(screen.getByTestId('ab-loop-region')).toHaveStyle({ left: '25%', width: '50%' });
  });

  it('reports the hovered time via onSeekHover with the correct ratio', () => {
    const onSeekHover = jest.fn();
    render(wrap(
      <SeekBar
        progress={0}
        duration={200}
        isPlaying={false}
        onSeek={jest.fn()}
        onSeekHover={onSeekHover}
      />,
    ));
    const bar = screen.getByTestId('seek-bar');
    mockRect(bar, 100);
    fireEvent.mouseMove(bar, { clientX: 50 });
    expect(onSeekHover).toHaveBeenLastCalledWith(100);

    fireEvent.mouseLeave(bar);
    expect(onSeekHover).toHaveBeenLastCalledWith(null);
  });

  it('shows the seek preview thumbnail when one is provided', () => {
    render(wrap(
      <SeekBar
        progress={0}
        duration={200}
        isPlaying={false}
        onSeek={jest.fn()}
        seekPreviewThumbnail="data:image/jpeg;base64,ABC"
      />,
    ));
    const bar = screen.getByTestId('seek-bar');
    mockRect(bar, 100);
    fireEvent.mouseMove(bar, { clientX: 25 });

    const img = screen.getByTestId('seek-preview').querySelector('img');
    expect(img?.getAttribute('src')).toBe('data:image/jpeg;base64,ABC');
  });

  it('marks the wrapper with data-hover while the cursor is over the bar', () => {
    render(wrap(
      <SeekBar progress={0} duration={100} isPlaying={false} onSeek={jest.fn()} />,
    ));
    const bar = screen.getByTestId('seek-bar');
    expect(bar).not.toHaveAttribute('data-hover');
    fireEvent.mouseEnter(bar);
    expect(bar).toHaveAttribute('data-hover', 'true');
    fireEvent.mouseLeave(bar);
    expect(bar).not.toHaveAttribute('data-hover');
  });
});

describe('SeekBar — smooth progress (with videoRef)', () => {
  let raf: ReturnType<typeof installRafShim>;

  beforeEach(() => {
    raf = installRafShim();
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('drives the slider value from videoRef.currentTime on each frame while playing', () => {
    const video = makeVideo(0);
    const ref = { current: video };

    const { rerender } = render(wrap(
      <SeekBar
        progress={0}
        duration={100}
        isPlaying
        videoRef={ref}
        onSeek={jest.fn()}
      />,
    ));

    expect(raf.pending()).toBe(1);

    video.currentTime = 17.5;
    act(() => raf.flushFrame());

    let slider = screen.getByRole('slider');
    expect(Number(slider.getAttribute('aria-valuenow'))).toBeCloseTo(17.5, 1);

    video.currentTime = 42.25;
    act(() => raf.flushFrame());
    slider = screen.getByRole('slider');
    expect(Number(slider.getAttribute('aria-valuenow'))).toBeCloseTo(42.25, 1);

    rerender(wrap(
      <SeekBar
        progress={42}
        duration={100}
        isPlaying={false}
        videoRef={ref}
        onSeek={jest.fn()}
      />,
    ));
    expect(raf.pending()).toBe(0);
  });

  it('ignores the progress prop when videoRef supplies a value', () => {
    const video = makeVideo(10);
    const ref = { current: video };

    render(wrap(
      <SeekBar
        progress={999}
        duration={100}
        isPlaying={false}
        videoRef={ref}
        onSeek={jest.fn()}
      />,
    ));

    const slider = screen.getByRole('slider');
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(10);
  });
});
