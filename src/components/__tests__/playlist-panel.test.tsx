import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaylistPanel from '@/components/playlist-panel';
import type { PlaylistItem } from '@/types';

// Mock @tanstack/react-virtual so all items are rendered in JSDOM (no real scroll height)
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        index: i,
        start: i * estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

const defaultProps = {
  playlist: [] as PlaylistItem[],
  currentVideoIndex: null,
  onSelectVideo: jest.fn(),
  onFilesAdded: jest.fn(),
  onAddStream: jest.fn(),
  isOpen: true,
  isPinned: false,
  size: 'md' as const,
  onToggle: jest.fn(),
  onTogglePin: jest.fn(),
  onSizeChange: jest.fn(),
};

const mockPlaylist: PlaylistItem[] = [
  { name: 'Video 1.mp4', url: 'blob:url1', type: 'video' },
  { name: 'Video 2.mkv', url: 'blob:url2', type: 'video' },
  { name: 'Live Stream', url: 'http://example.com/stream', type: 'stream' },
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
    const activeButton = screen.getByText('Video 2.mkv').closest('button');
    expect(activeButton?.className).toContain('bg-primary');
  });

  it('does not mark other items as active', () => {
    render(<PlaylistPanel {...defaultProps} playlist={mockPlaylist} currentVideoIndex={0} />);
    const inactiveButton = screen.getByText('Video 2.mkv').closest('button');
    expect(inactiveButton?.className).not.toContain('bg-primary');
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
});
