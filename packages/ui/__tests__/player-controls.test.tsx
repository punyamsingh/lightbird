import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerControls from '../src/player-controls';
import type { VideoFilters, Chapter } from '@lightbird/core';

const defaultFilters: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
};

const defaultProps = {
  isPlaying: false,
  progress: 0,
  duration: 100,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  loop: false,
  isFullScreen: false,
  filters: defaultFilters,
  zoom: 1,
  subtitles: [],
  activeSubtitle: '-1',
  audioTracks: [],
  activeAudioTrack: '0',
  onPlayPause: jest.fn(),
  onSeek: jest.fn(),
  onVolumeChange: jest.fn(),
  onMuteToggle: jest.fn(),
  onPlaybackRateChange: jest.fn(),
  onLoopToggle: jest.fn(),
  onFullScreenToggle: jest.fn(),
  onFrameStep: jest.fn(),
  onScreenshot: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onFiltersChange: jest.fn(),
  onZoomChange: jest.fn(),
  onSubtitleChange: jest.fn(),
  onAudioTrackChange: jest.fn(),
};

describe('PlayerControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PlayerControls {...defaultProps} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('shows 8 speed options when the speed selector is opened', () => {
    render(<PlayerControls {...defaultProps} />);
    const speedButton = screen.getByText('1x');
    fireEvent.click(speedButton);
    const radioItems = screen.getAllByRole('radio');
    expect(radioItems).toHaveLength(8);
  });

  it('calls onPlayPause when the play/pause button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    // Play/pause is the 2nd button (index 1), after Previous
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(defaultProps.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('calls onMuteToggle when the mute button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    // Mute is the 4th button (index 3): Previous, Play/Pause, Next, Mute
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);
    expect(defaultProps.onMuteToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onFullScreenToggle when the fullscreen button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Fullscreen is the last button
    fireEvent.click(buttons[buttons.length - 1]);
    expect(defaultProps.onFullScreenToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onScreenshot when the Screenshot item is clicked from the settings menu', () => {
    render(<PlayerControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('Screenshot'));
    expect(defaultProps.onScreenshot).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when the previous button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when the next button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('shows the current playback rate in the speed button', () => {
    render(<PlayerControls {...defaultProps} playbackRate={1.5} />);
    expect(screen.getByText('1.5x')).toBeInTheDocument();
  });

  it('calls onPlaybackRateChange when a speed option is selected', () => {
    render(<PlayerControls {...defaultProps} />);
    fireEvent.click(screen.getByText('1x'));
    // Find and click the 2x option
    const twoXLabel = screen.getByText('2x');
    fireEvent.click(twoXLabel);
    expect(defaultProps.onPlaybackRateChange).toHaveBeenCalledWith(2);
  });

  describe('Picture-in-Picture button (inside settings menu)', () => {
    it('does not render PiP button when pipSupported=false', () => {
      render(<PlayerControls {...defaultProps} pipSupported={false} />);
      fireEvent.click(screen.getByLabelText('Settings'));
      expect(screen.queryByLabelText(/picture-in-picture/i)).not.toBeInTheDocument();
    });

    it('renders PiP button when pipSupported=true', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} onTogglePiP={jest.fn()} />);
      fireEvent.click(screen.getByLabelText('Settings'));
      expect(screen.getByLabelText('Enter picture-in-picture')).toBeInTheDocument();
    });

    it('clicking PiP button calls onTogglePiP', () => {
      const onTogglePiP = jest.fn();
      render(<PlayerControls {...defaultProps} pipSupported={true} onTogglePiP={onTogglePiP} />);
      fireEvent.click(screen.getByLabelText('Settings'));
      fireEvent.click(screen.getByLabelText('Enter picture-in-picture'));
      expect(onTogglePiP).toHaveBeenCalledTimes(1);
    });

    it('shows "Exit picture-in-picture" label when isPiP=true', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} isPiP={true} onTogglePiP={jest.fn()} />);
      fireEvent.click(screen.getByLabelText('Settings'));
      expect(screen.getByLabelText('Exit picture-in-picture')).toBeInTheDocument();
    });

    it('shows "Enter picture-in-picture" label when isPiP=false', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} isPiP={false} onTogglePiP={jest.fn()} />);
      fireEvent.click(screen.getByLabelText('Settings'));
      expect(screen.getByLabelText('Enter picture-in-picture')).toBeInTheDocument();
    });
  });
});

const mockChapters: Chapter[] = [
  { index: 0, title: 'Introduction', startTime: 0, endTime: 142.5 },
  { index: 1, title: 'Act 1', startTime: 142.5, endTime: 300 },
  { index: 2, title: 'Credits', startTime: 300, endTime: 600 },
];

describe('PlayerControls — chapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no chapter tick marks when chapters prop is empty', () => {
    render(<PlayerControls {...defaultProps} chapters={[]} duration={600} />);
    expect(screen.queryAllByTestId('chapter-tick')).toHaveLength(0);
  });

  it('renders n-1 chapter tick marks for n chapters (skips first)', () => {
    render(<PlayerControls {...defaultProps} chapters={mockChapters} duration={600} />);
    const ticks = screen.getAllByTestId('chapter-tick');
    // 3 chapters → 2 ticks (skip index 0)
    expect(ticks).toHaveLength(2);
  });

  it('does not show the chapters button when chapters is empty', () => {
    render(<PlayerControls {...defaultProps} chapters={[]} />);
    expect(screen.queryByRole('button', { name: /chapters/i })).toBeNull();
  });

  it('shows the chapters button when chapters are provided', () => {
    render(<PlayerControls {...defaultProps} chapters={mockChapters} duration={600} />);
    expect(screen.getByRole('button', { name: /chapters/i })).toBeInTheDocument();
  });

  it('calls onGoToChapter with correct index when a chapter item is clicked', () => {
    const onGoToChapter = jest.fn();
    render(
      <PlayerControls
        {...defaultProps}
        chapters={mockChapters}
        duration={600}
        onGoToChapter={onGoToChapter}
      />,
    );
    // Open the chapters popover
    fireEvent.click(screen.getByRole('button', { name: /chapters/i }));
    // Click 'Act 1' (index 1)
    fireEvent.click(screen.getByText('Act 1'));
    expect(onGoToChapter).toHaveBeenCalledWith(1);
  });
});

// jsdom returns a zero-sized rect by default; mock a 100px-wide seek bar.
function mockSeekBarRect(el: HTMLElement) {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 100,
    top: 0,
    height: 8,
    right: 100,
    bottom: 8,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('PlayerControls — seek-hover preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSeekHover with the hovered timestamp on mouse move over the seek bar', () => {
    const onSeekHover = jest.fn();
    render(<PlayerControls {...defaultProps} duration={200} onSeekHover={onSeekHover} />);
    const seekBar = screen.getByTestId('seek-bar');
    mockSeekBarRect(seekBar);

    fireEvent.mouseMove(seekBar, { clientX: 50 });
    // 50% of a 200s video
    expect(onSeekHover).toHaveBeenCalledWith(100);
  });

  it('shows a preview tooltip with the formatted timestamp while hovering', () => {
    render(<PlayerControls {...defaultProps} duration={200} />);
    const seekBar = screen.getByTestId('seek-bar');
    mockSeekBarRect(seekBar);

    fireEvent.mouseMove(seekBar, { clientX: 50 });
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
    const seekBar = screen.getByTestId('seek-bar');
    mockSeekBarRect(seekBar);

    fireEvent.mouseMove(seekBar, { clientX: 25 });
    const img = screen.getByTestId('seek-preview').querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('data:image/jpeg;base64,XYZ');
  });

  it('hides the preview and calls onSeekHover(null) on mouse leave', () => {
    const onSeekHover = jest.fn();
    render(<PlayerControls {...defaultProps} duration={200} onSeekHover={onSeekHover} />);
    const seekBar = screen.getByTestId('seek-bar');
    mockSeekBarRect(seekBar);

    fireEvent.mouseMove(seekBar, { clientX: 50 });
    expect(screen.getByTestId('seek-preview')).toBeInTheDocument();

    fireEvent.mouseLeave(seekBar);
    expect(screen.queryByTestId('seek-preview')).not.toBeInTheDocument();
    expect(onSeekHover).toHaveBeenLastCalledWith(null);
  });

  it('does not call onSeekHover when duration is zero', () => {
    const onSeekHover = jest.fn();
    render(<PlayerControls {...defaultProps} duration={0} onSeekHover={onSeekHover} />);
    const seekBar = screen.getByTestId('seek-bar');
    mockSeekBarRect(seekBar);

    fireEvent.mouseMove(seekBar, { clientX: 50 });
    expect(onSeekHover).not.toHaveBeenCalled();
  });
});

describe('PlayerControls — A-B loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // A-B loop has no visible button anymore — it is keyboard-only.
  // The seek-bar markers / region remain as visual confirmation that the
  // shortcut took effect, so the rest of the suite still covers them.

  it('renders no A-B markers when no points are set', () => {
    render(<PlayerControls {...defaultProps} duration={200} onABLoopCycle={jest.fn()} />);
    expect(screen.queryByTestId('ab-marker-a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ab-marker-b')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ab-loop-region')).not.toBeInTheDocument();
  });

  it('renders marker A positioned by ratio when point A is set', () => {
    render(
      <PlayerControls
        {...defaultProps}
        duration={200}
        onABLoopCycle={jest.fn()}
        abLoop={{ pointA: 50, pointB: null, isLooping: false }}
      />,
    );
    expect(screen.getByTestId('ab-marker-a')).toHaveStyle({ left: '25%' });
    expect(screen.queryByTestId('ab-marker-b')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ab-loop-region')).not.toBeInTheDocument();
  });

  it('renders both markers and the loop region when the loop is active', () => {
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

});
