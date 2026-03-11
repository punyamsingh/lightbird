import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerControls from '@/components/player-controls';
import type { VideoFilters } from '@/types';

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
});
