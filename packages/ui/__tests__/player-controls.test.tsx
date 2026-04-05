import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerControls from '../src/player-controls';
import type { VideoFilters, Chapter } from 'lightbird';

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

  it('calls onScreenshot when the screenshot button is clicked', () => {
    render(<PlayerControls {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Screenshot is 3rd from the end (before Loop and Fullscreen)
    fireEvent.click(buttons[buttons.length - 3]);
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

  describe('Picture-in-Picture button', () => {
    it('does not render PiP button when pipSupported=false', () => {
      render(<PlayerControls {...defaultProps} pipSupported={false} />);
      expect(screen.queryByLabelText(/picture-in-picture/i)).not.toBeInTheDocument();
    });

    it('renders PiP button when pipSupported=true', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} onTogglePiP={jest.fn()} />);
      expect(screen.getByLabelText('Enter picture-in-picture')).toBeInTheDocument();
    });

    it('clicking PiP button calls onTogglePiP', () => {
      const onTogglePiP = jest.fn();
      render(<PlayerControls {...defaultProps} pipSupported={true} onTogglePiP={onTogglePiP} />);
      fireEvent.click(screen.getByLabelText('Enter picture-in-picture'));
      expect(onTogglePiP).toHaveBeenCalledTimes(1);
    });

    it('shows "Exit picture-in-picture" label when isPiP=true', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} isPiP={true} onTogglePiP={jest.fn()} />);
      expect(screen.getByLabelText('Exit picture-in-picture')).toBeInTheDocument();
    });

    it('shows "Enter picture-in-picture" label when isPiP=false', () => {
      render(<PlayerControls {...defaultProps} pipSupported={true} isPiP={false} onTogglePiP={jest.fn()} />);
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
