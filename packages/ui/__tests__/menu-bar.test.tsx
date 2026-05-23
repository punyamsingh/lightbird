import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MenuBar from '../src/menu-bar';
import type { VideoFilters, Chapter, AudioTrack, Subtitle } from '@lightbird/core';

const defaultFilters: VideoFilters = {
  brightness: 100, contrast: 100, saturate: 100, hue: 0,
};

const makeProps = (overrides: Partial<React.ComponentProps<typeof MenuBar>> = {}) => ({
  isPlaying: false,
  isFullScreen: false,
  isMuted: false,
  loop: false,
  playbackRate: 1,
  filters: defaultFilters,
  zoom: 1,
  subtitles: [] as Subtitle[],
  activeSubtitle: '-1',
  audioTracks: [] as AudioTrack[],
  activeAudioTrack: '0',
  chapters: [] as Chapter[],
  currentChapter: null,
  isPiP: false,
  pipSupported: false,
  playlistOpen: false,
  abLoop: { pointA: null, pointB: null, isLooping: false },
  onPlayPause: jest.fn(),
  onStop: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onSeekRelative: jest.fn(),
  onFrameStep: jest.fn(),
  onPlaybackRateChange: jest.fn(),
  onLoopToggle: jest.fn(),
  onABLoopCycle: jest.fn(),
  onGoToChapter: jest.fn(),
  onMuteToggle: jest.fn(),
  onVolumeStep: jest.fn(),
  onAudioTrackChange: jest.fn(),
  onFullScreenToggle: jest.fn(),
  onTogglePiP: jest.fn(),
  onScreenshot: jest.fn(),
  onFiltersChange: jest.fn(),
  onZoomChange: jest.fn(),
  onSubtitleChange: jest.fn(),
  onSubtitleUpload: jest.fn(),
  onShowInfo: jest.fn(),
  onOpenShortcuts: jest.fn(),
  onOpenFile: jest.fn(),
  onTogglePlaylist: jest.fn(),
  ...overrides,
});

const openMenu = (label: string) => {
  fireEvent.click(screen.getByTestId(`menu-${label.toLowerCase()}`));
};

describe('MenuBar — structure', () => {
  it('renders the eight VLC-style top-level menus', () => {
    render(<MenuBar {...makeProps()} />);
    for (const m of ['media', 'playback', 'audio', 'video', 'subtitle', 'tools', 'view', 'help']) {
      expect(screen.getByTestId(`menu-${m}`)).toBeInTheDocument();
    }
  });
});

describe('MenuBar — Media menu', () => {
  it('Open File triggers onOpenFile', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Media');
    fireEvent.click(screen.getByText(/Open File/i));
    expect(props.onOpenFile).toHaveBeenCalledTimes(1);
  });
});

describe('MenuBar — Playback menu', () => {
  it('shows "Play" when paused and dispatches onPlayPause', () => {
    const props = makeProps({ isPlaying: false });
    render(<MenuBar {...props} />);
    openMenu('Playback');
    fireEvent.click(screen.getByText('Play'));
    expect(props.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('shows "Pause" when playing', () => {
    render(<MenuBar {...makeProps({ isPlaying: true })} />);
    openMenu('Playback');
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('lists all 8 playback rates and dispatches the chosen one', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Playback');
    // The 8 rates appear as menu items
    expect(screen.getByText('0.25x')).toBeInTheDocument();
    expect(screen.getByText('1.5x')).toBeInTheDocument();
    fireEvent.click(screen.getByText('1.5x'));
    expect(props.onPlaybackRateChange).toHaveBeenCalledWith(1.5);
  });

  it('Jump Forward 10s calls onSeekRelative(+10)', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Playback');
    fireEvent.click(screen.getByText(/Jump Forward 10s/));
    expect(props.onSeekRelative).toHaveBeenCalledWith(10);
  });

  it('Jump Backward 10s calls onSeekRelative(-10)', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Playback');
    fireEvent.click(screen.getByText(/Jump Backward 10s/));
    expect(props.onSeekRelative).toHaveBeenCalledWith(-10);
  });

  it('shows chapter items only when chapters are present', () => {
    const props = makeProps({
      chapters: [
        { index: 0, title: 'Intro', startTime: 0, endTime: 10 },
        { index: 1, title: 'Mid', startTime: 10, endTime: 20 },
      ],
    });
    render(<MenuBar {...props} />);
    openMenu('Playback');
    fireEvent.click(screen.getByText('Mid'));
    expect(props.onGoToChapter).toHaveBeenCalledWith(1);
  });
});

describe('MenuBar — Audio menu', () => {
  it('Mute item dispatches onMuteToggle', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Audio');
    fireEvent.click(screen.getByText('Mute'));
    expect(props.onMuteToggle).toHaveBeenCalledTimes(1);
  });

  it('lists audio tracks and dispatches onAudioTrackChange on selection', () => {
    const props = makeProps({
      audioTracks: [
        { id: '0', name: 'English' },
        { id: '1', name: 'Japanese' },
      ],
    });
    render(<MenuBar {...props} />);
    openMenu('Audio');
    fireEvent.click(screen.getByText('Japanese'));
    expect(props.onAudioTrackChange).toHaveBeenCalledWith('1');
  });
});

describe('MenuBar — Video menu', () => {
  it('Take Screenshot dispatches onScreenshot', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Video');
    fireEvent.click(screen.getByText('Take Screenshot'));
    expect(props.onScreenshot).toHaveBeenCalledTimes(1);
  });

  it('hides Picture-in-Picture when not supported', () => {
    render(<MenuBar {...makeProps({ pipSupported: false })} />);
    openMenu('Video');
    expect(screen.queryByText('Picture-in-Picture')).not.toBeInTheDocument();
  });

  it('shows Picture-in-Picture when supported and dispatches onTogglePiP', () => {
    const props = makeProps({ pipSupported: true });
    render(<MenuBar {...props} />);
    openMenu('Video');
    fireEvent.click(screen.getByText('Picture-in-Picture'));
    expect(props.onTogglePiP).toHaveBeenCalledTimes(1);
  });

  it('changes zoom when a zoom item is selected', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Video');
    fireEvent.click(screen.getByText('200%'));
    expect(props.onZoomChange).toHaveBeenCalledWith(2);
  });
});

describe('MenuBar — Subtitle menu', () => {
  it('lists Off plus available tracks and dispatches onSubtitleChange', () => {
    const props = makeProps({
      subtitles: [
        { id: 'a', name: 'English', type: 'external' },
        { id: 'b', name: 'Spanish', type: 'embedded' },
      ] as Subtitle[],
      activeSubtitle: 'a',
    });
    render(<MenuBar {...props} />);
    openMenu('Subtitle');
    fireEvent.click(screen.getByText('Spanish'));
    expect(props.onSubtitleChange).toHaveBeenCalledWith('b');
  });

  it('shows "No subtitles available" when the list is empty', () => {
    render(<MenuBar {...makeProps()} />);
    openMenu('Subtitle');
    expect(screen.getByText(/No subtitles available/i)).toBeInTheDocument();
  });
});

describe('MenuBar — Tools and View menus', () => {
  it('Tools → Video Information dispatches onShowInfo', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('Tools');
    fireEvent.click(screen.getByText(/Video Information/));
    expect(props.onShowInfo).toHaveBeenCalledTimes(1);
  });

  it('View → Playlist dispatches onTogglePlaylist', () => {
    const props = makeProps();
    render(<MenuBar {...props} />);
    openMenu('View');
    fireEvent.click(screen.getAllByText('Playlist')[0]);
    expect(props.onTogglePlaylist).toHaveBeenCalledTimes(1);
  });
});
