import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaylistPanel from '@/components/playlist-panel';
import type { PlaylistItem } from '@/types';

const defaultProps = {
  playlist: [] as PlaylistItem[],
  currentVideoIndex: null,
  onSelectVideo: jest.fn(),
  onFilesAdded: jest.fn(),
  onAddStream: jest.fn(),
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
});
