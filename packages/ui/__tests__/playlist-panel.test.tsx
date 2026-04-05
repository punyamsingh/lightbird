import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaylistPanel from '../src/playlist-panel';
import type { PlaylistItem } from '@lightbird/core';

// Mock @dnd-kit to avoid needing pointer events in jsdom
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
}));
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Mock m3u-parser to avoid DOM side effects in export tests
jest.mock('@lightbird/core', () => ({
  ...jest.requireActual('@lightbird/core'),
  exportPlaylist: jest.fn(),
  parseM3U8: jest.fn().mockReturnValue([]),
}));

const defaultProps = {
  playlist: [] as PlaylistItem[],
  currentVideoIndex: null,
  onSelectVideo: jest.fn(),
  onFilesAdded: jest.fn(),
  onFolderFilesAdded: jest.fn(),
  onAddStream: jest.fn(),
  onRemoveItem: jest.fn(),
  onReorder: jest.fn(),
  onImportM3U: jest.fn(),
  isOpen: true,
  isPinned: false,
  size: 'md' as const,
  onToggle: jest.fn(),
  onTogglePin: jest.fn(),
  onSizeChange: jest.fn(),
};

const mockPlaylist: PlaylistItem[] = [
  { id: 'id-1', name: 'Video 1.mp4', url: 'blob:url1', type: 'video' },
  { id: 'id-2', name: 'Video 2.mkv', url: 'blob:url2', type: 'video' },
  { id: 'id-3', name: 'Live Stream', url: 'http://example.com/stream', type: 'stream' },
];

describe('PlaylistPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an empty state message when playlist is empty', () => {
    render(<PlaylistPanel {...defaultProps} />);
    expect(screen.getByText(/Your playlist is empty/)).toBeInTheDocument();
  });

  it('renders each playlist item name', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    expect(screen.getByText('Video 1.mp4')).toBeInTheDocument();
    expect(screen.getByText('Video 2.mkv')).toBeInTheDocument();
    expect(screen.getByText('Live Stream')).toBeInTheDocument();
  });

  it('does not render the empty state when playlist has items', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    expect(screen.queryByText(/Your playlist is empty/)).not.toBeInTheDocument();
  });

  it('applies visual distinction to the currently playing item', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} currentVideoIndex={1} />);
    // The active item wrapper div has bg-primary class
    const activeItem = screen.getByText('Video 2.mkv').closest('button');
    // The parent div should have bg-primary class
    expect(activeItem?.parentElement?.className).toContain('bg-primary');
  });

  it('does not mark other items as active', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} currentVideoIndex={0} />);
    const inactiveItem = screen.getByText('Video 2.mkv').closest('button');
    expect(inactiveItem?.parentElement?.className).not.toContain('bg-primary');
  });

  it('calls onSelectVideo with the correct index when an item is clicked', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    fireEvent.click(screen.getByText('Video 2.mkv'));
    expect(defaultProps.onSelectVideo).toHaveBeenCalledWith(1);
  });

  it('calls onSelectVideo with index 0 for the first item', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    fireEvent.click(screen.getByText('Video 1.mp4'));
    expect(defaultProps.onSelectVideo).toHaveBeenCalledWith(0);
  });

  it('calls onAddStream with the entered URL on form submit', () => {
    render(<PlaylistPanel {...defaultProps} />);
    const urlInput = screen.getByPlaceholderText('Enter stream URL');
    fireEvent.change(urlInput, { target: { value: 'http://example.com/stream.m3u8' } });
    fireEvent.submit(urlInput.closest('form')!);
    expect(defaultProps.onAddStream).toHaveBeenCalledWith('http://example.com/stream.m3u8');
  });

  it('clears the URL input after a stream is added', () => {
    render(<PlaylistPanel {...defaultProps} />);
    const urlInput = screen.getByPlaceholderText('Enter stream URL') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'http://example.com/stream.m3u8' } });
    fireEvent.submit(urlInput.closest('form')!);
    expect(urlInput.value).toBe('');
  });

  it('does not call onAddStream when stream URL is empty', () => {
    render(<PlaylistPanel {...defaultProps} />);
    const urlInput = screen.getByPlaceholderText('Enter stream URL');
    fireEvent.submit(urlInput.closest('form')!);
    expect(defaultProps.onAddStream).not.toHaveBeenCalled();
  });

  it('calls onToggle when the collapse button is clicked', () => {
    render(<PlaylistPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /collapse/i }));
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onTogglePin when the pin button is clicked', () => {
    render(<PlaylistPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /pin playlist/i }));
    expect(defaultProps.onTogglePin).toHaveBeenCalledTimes(1);
  });

  it('calls onSizeChange when the resize button is clicked', () => {
    render(<PlaylistPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /resize playlist/i }));
    expect(defaultProps.onSizeChange).toHaveBeenCalledTimes(1);
  });

  it('shows collapsed drawer strip when isOpen is false', () => {
    render(<PlaylistPanel {...defaultProps} isOpen={false} />);
    expect(screen.getByRole('button', { name: /expand playlist/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter stream URL')).not.toBeInTheDocument();
  });

  it('calls onToggle when the expand button is clicked in collapsed state', () => {
    render(<PlaylistPanel {...defaultProps} isOpen={false} />);
    fireEvent.click(screen.getByRole('button', { name: /expand playlist/i }));
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows item count badge in collapsed state when playlist has items', () => {
    render(<PlaylistPanel {...defaultProps} isOpen={false} playlist={mockPlaylist} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows Unpin label when isPinned is true', () => {
    render(<PlaylistPanel {...defaultProps} isPinned={true} />);
    expect(screen.getByRole('button', { name: /unpin playlist/i })).toBeInTheDocument();
  });

  it('renders a remove button for each playlist item', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove from playlist/i });
    expect(removeButtons).toHaveLength(mockPlaylist.length);
  });

  it('calls onRemoveItem with the correct index when remove is clicked', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove from playlist/i });
    fireEvent.click(removeButtons[1]);
    expect(defaultProps.onRemoveItem).toHaveBeenCalledWith(1);
  });

  it('shows an Export button when playlist has items', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    expect(screen.getByRole('button', { name: /export playlist/i })).toBeInTheDocument();
  });

  it('does not show Export button when playlist is empty', () => {
    render(<PlaylistPanel {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /export playlist/i })).not.toBeInTheDocument();
  });

  it('shows an Import Playlist button', () => {
    render(<PlaylistPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /import playlist/i })).toBeInTheDocument();
  });

  it('shows the Open Folder button', () => {
    render(<PlaylistPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
  });

  it('shows sort control when playlist has more than 1 item', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} />);
    expect(screen.getByRole('combobox', { name: /sort playlist/i })).toBeInTheDocument();
  });

  it('does not show sort control when playlist has 1 or fewer items', () => {
    render(<PlaylistPanel {...defaultProps} playlist={[mockPlaylist[0]]} />);
    expect(screen.queryByRole('combobox', { name: /sort playlist/i })).not.toBeInTheDocument();
  });

  it('shows duration badge when item has a duration', () => {
    const playlistWithDuration: PlaylistItem[] = [
      { id: 'id-1', name: 'Video.mp4', url: 'blob:url1', type: 'video', duration: 125 },
    ];
    render(<PlaylistPanel {...defaultProps} playlist={playlistWithDuration} />);
    // 125 seconds = 2:05
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });
});
