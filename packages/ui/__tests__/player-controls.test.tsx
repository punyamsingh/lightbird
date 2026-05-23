import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerControls from '../src/player-controls';
import type { Chapter } from '@lightbird/core';

const defaultProps = {
  isPlaying: false,
  progress: 0,
  duration: 100,
  volume: 1,
  isMuted: false,
  loop: false,
  isFullScreen: false,
  onPlayPause: jest.fn(),
  onSeek: jest.fn(),
  onVolumeChange: jest.fn(),
  onMuteToggle: jest.fn(),
  onLoopToggle: jest.fn(),
  onFullScreenToggle: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
};

describe('PlayerControls — transport row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the slim control bar with the seek bar', () => {
    render(<PlayerControls {...defaultProps} />);
    expect(screen.getByTestId('player-controls')).toBeInTheDocument();
    expect(screen.getByTestId('seek-bar')).toBeInTheDocument();
  });

  it('calls onPlayPause when the play button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    fireEvent.click(screen.getByTestId('play-pause'));
    expect(defaultProps.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious / onNext from the transport buttons', () => {
    render(<PlayerControls {...defaultProps} />);
    fireEvent.click(screen.getByTestId('previous'));
    fireEvent.click(screen.getByTestId('next'));
    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('renders the stop button only when onStop is supplied', () => {
    const { rerender } = render(<PlayerControls {...defaultProps} />);
    expect(screen.queryByTestId('stop')).not.toBeInTheDocument();

    const onStop = jest.fn();
    rerender(<PlayerControls {...defaultProps} onStop={onStop} />);
    fireEvent.click(screen.getByTestId('stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onMuteToggle and onFullScreenToggle from their icon buttons', () => {
    render(<PlayerControls {...defaultProps} />);
    fireEvent.click(screen.getByTestId('mute'));
    fireEvent.click(screen.getByTestId('fullscreen'));
    expect(defaultProps.onMuteToggle).toHaveBeenCalledTimes(1);
    expect(defaultProps.onFullScreenToggle).toHaveBeenCalledTimes(1);
  });

  it('toggles the loop button via onLoopToggle and reflects the active state', () => {
    const { rerender } = render(<PlayerControls {...defaultProps} loop={false} />);
    const loopBtn = screen.getByTestId('loop');
    expect(loopBtn).not.toHaveAttribute('data-active');
    fireEvent.click(loopBtn);
    expect(defaultProps.onLoopToggle).toHaveBeenCalledTimes(1);

    rerender(<PlayerControls {...defaultProps} loop={true} />);
    expect(screen.getByTestId('loop')).toHaveAttribute('data-active', 'true');
  });

  it('renders the playlist toggle only when onTogglePlaylist is supplied', () => {
    const onTogglePlaylist = jest.fn();
    const { rerender } = render(<PlayerControls {...defaultProps} />);
    expect(screen.queryByTestId('playlist-toggle')).not.toBeInTheDocument();

    rerender(<PlayerControls {...defaultProps} onTogglePlaylist={onTogglePlaylist} playlistOpen />);
    const btn = screen.getByTestId('playlist-toggle');
    expect(btn).toHaveAttribute('data-active', 'true');
    fireEvent.click(btn);
    expect(onTogglePlaylist).toHaveBeenCalledTimes(1);
  });

  it('shows the current/total time formatted', () => {
    render(<PlayerControls {...defaultProps} progress={75} duration={195} />);
    expect(screen.getByTestId('time-current').textContent).toBe('01:15');
    expect(screen.getByText('03:15')).toBeInTheDocument();
  });

  it('shows 0% when volume is muted', () => {
    render(<PlayerControls {...defaultProps} isMuted={true} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

const mockChapters: Chapter[] = [
  { index: 0, title: 'Introduction', startTime: 0, endTime: 142.5 },
  { index: 1, title: 'Act 1', startTime: 142.5, endTime: 300 },
  { index: 2, title: 'Credits', startTime: 300, endTime: 600 },
];

describe('PlayerControls — chapters', () => {
  it('renders n-1 chapter tick marks for n chapters', () => {
    render(<PlayerControls {...defaultProps} chapters={mockChapters} duration={600} />);
    expect(screen.getAllByTestId('chapter-tick')).toHaveLength(2);
  });

  it('renders no chapter ticks when chapters prop is empty', () => {
    render(<PlayerControls {...defaultProps} chapters={[]} duration={600} />);
    expect(screen.queryAllByTestId('chapter-tick')).toHaveLength(0);
  });
});

function mockSeekBarRect(el: HTMLElement) {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, width: 100, top: 0, height: 8, right: 100, bottom: 8, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('PlayerControls — seek-hover preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSeekHover with the hovered timestamp on mouse move', () => {
    const onSeekHover = jest.fn();
    render(<PlayerControls {...defaultProps} duration={200} onSeekHover={onSeekHover} />);
    const bar = screen.getByTestId('seek-bar');
    mockSeekBarRect(bar);
    fireEvent.mouseMove(bar, { clientX: 50 });
    expect(onSeekHover).toHaveBeenCalledWith(100);
  });

  it('shows a preview tooltip with the formatted timestamp on hover', () => {
    render(<PlayerControls {...defaultProps} duration={200} />);
    const bar = screen.getByTestId('seek-bar');
    mockSeekBarRect(bar);
    fireEvent.mouseMove(bar, { clientX: 50 });
    expect(screen.getByTestId('seek-preview')).toBeInTheDocument();
    expect(screen.getByText('01:40')).toBeInTheDocument();
  });

  it('renders the captured thumbnail image when seekPreviewThumbnail is provided', () => {
    render(
      <PlayerControls
        {...defaultProps}
        duration={200}
        seekPreviewThumbnail="data:image/jpeg;base64,XYZ"
      />,
    );
    const bar = screen.getByTestId('seek-bar');
    mockSeekBarRect(bar);
    fireEvent.mouseMove(bar, { clientX: 25 });
    const img = screen.getByTestId('seek-preview').querySelector('img');
    expect(img?.getAttribute('src')).toBe('data:image/jpeg;base64,XYZ');
  });

  it('hides the preview and calls onSeekHover(null) on mouse leave', () => {
    const onSeekHover = jest.fn();
    render(<PlayerControls {...defaultProps} duration={200} onSeekHover={onSeekHover} />);
    const bar = screen.getByTestId('seek-bar');
    mockSeekBarRect(bar);
    fireEvent.mouseMove(bar, { clientX: 50 });
    fireEvent.mouseLeave(bar);
    expect(screen.queryByTestId('seek-preview')).not.toBeInTheDocument();
    expect(onSeekHover).toHaveBeenLastCalledWith(null);
  });
});

describe('PlayerControls — A-B loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the A-B loop button when onABLoopCycle is not provided', () => {
    render(<PlayerControls {...defaultProps} />);
    expect(screen.queryByTestId('ab-loop-button')).not.toBeInTheDocument();
  });

  it('renders the A-B loop button and dispatches onABLoopCycle on click', () => {
    const onABLoopCycle = jest.fn();
    render(<PlayerControls {...defaultProps} onABLoopCycle={onABLoopCycle} />);
    fireEvent.click(screen.getByTestId('ab-loop-button'));
    expect(onABLoopCycle).toHaveBeenCalledTimes(1);
  });

  it('renders both markers and the loop region when both points are set', () => {
    render(
      <PlayerControls
        {...defaultProps}
        duration={200}
        onABLoopCycle={jest.fn()}
        abLoop={{ pointA: 50, pointB: 150, isLooping: true }}
      />,
    );
    expect(screen.getByTestId('ab-marker-a')).toHaveStyle({ left: '25%' });
    expect(screen.getByTestId('ab-marker-b')).toHaveStyle({ left: '75%' });
    expect(screen.getByTestId('ab-loop-region')).toHaveStyle({ left: '25%', width: '50%' });
  });

  it('marks the A-B loop button active while the loop is running', () => {
    render(
      <PlayerControls
        {...defaultProps}
        onABLoopCycle={jest.fn()}
        abLoop={{ pointA: 50, pointB: 150, isLooping: true }}
      />,
    );
    expect(screen.getByTestId('ab-loop-button')).toHaveAttribute('data-active', 'true');
  });
});
