import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LightBirdPlayer from '../src/lightbird-player';
import { hasAcceptedDisclaimer, acceptDisclaimer } from '@lightbird/core';

let mockCompact = true;
let mockPlaying = false;
let mockPanel: any;
const mockPlaylist = {
  playlist: [], currentIndex: 0, currentItem: null,
  addFiles: jest.fn().mockResolvedValue(undefined), appendItem: jest.fn(),
  selectItem: jest.fn(), parseFiles: jest.fn(), removeItem: jest.fn(), reorderItems: jest.fn(),
};
const mockAddMagnet = jest.fn();
jest.mock('../src/hooks/use-compact-layout', () => ({ useCompactLayout: () => mockCompact }));
jest.mock('@openfeature/react-sdk', () => ({ useBooleanFlagValue: () => true }));
jest.mock('@lightbird/core', () => ({
  ...jest.requireActual('@lightbird/core'), hasAcceptedDisclaimer: jest.fn(), acceptDisclaimer: jest.fn(),
}));
jest.mock('@lightbird/core/react', () => ({
  ...jest.requireActual('@lightbird/core/react'),
  usePlaylist: () => mockPlaylist,
  useVideoPlayback: (...args: unknown[]) => ({ ...jest.requireActual('@lightbird/core/react').useVideoPlayback(...args), isPlaying: mockPlaying }),
  useMagnet: () => ({ addMagnet: mockAddMagnet, torrentStatus: { status: 'idle', progress: 0 } }),
}));
jest.mock('../src/playlist-panel', () => ({
  __esModule: true,
  default: (props: any) => { mockPanel = props; return null; },
}));
jest.mock('../src/player-controls', () => ({ __esModule: true, default: () => null }));

const stream = { name: 'Example', type: 'stream' as const, url: 'https://example.com/video.webm' };
function openPlaylist() { fireEvent.click(screen.getByRole('button', { name: 'Playlist (0)' })); }

beforeEach(() => {
  jest.clearAllMocks();
  mockCompact = true;
  mockPlaying = false;
  mockPlaylist.addFiles.mockResolvedValue(undefined);
  jest.mocked(hasAcceptedDisclaimer).mockReturnValue(true);
  mockAddMagnet.mockResolvedValue([{ ...stream, id: 'torrent-item' }]);
});

test('restores an auto-hidden desktop playlist after compact mode and pause', () => {
  mockCompact = false;
  const { rerender } = render(<LightBirdPlayer />);
  expect(mockPanel.isOpen).toBe(true);
  mockPlaying = true;
  rerender(<LightBirdPlayer />);
  expect(mockPanel.isOpen).toBe(false);
  mockCompact = true;
  rerender(<LightBirdPlayer />);
  mockPlaying = false;
  rerender(<LightBirdPlayer />);
  expect(mockPanel.isOpen).toBe(false);
  mockCompact = false;
  rerender(<LightBirdPlayer />);
  expect(mockPanel.isOpen).toBe(true);
});

test('closes the compact playlist after folder processing succeeds', async () => {
  render(<LightBirdPlayer />);
  openPlaylist();
  expect(mockPanel.isOpen).toBe(true);
  let finish!: () => void;
  mockPlaylist.addFiles.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = mockPanel.onFolderFilesAdded([new File(['video'], 'clip.webm')]); });
  expect(mockPanel.isOpen).toBe(true);
  await act(async () => { finish(); await pending; });
  expect(mockPanel.isOpen).toBe(false);
});

test('keeps the compact playlist open if folder processing fails', async () => {
  render(<LightBirdPlayer />);
  openPlaylist();
  mockPlaylist.addFiles.mockRejectedValueOnce(new Error('read failed'));
  await act(async () => { await expect(mockPanel.onFolderFilesAdded([])).rejects.toThrow('read failed'); });
  expect(mockPanel.isOpen).toBe(true);
});

test('closes the compact playlist after importing M3U entries', () => {
  render(<LightBirdPlayer />);
  openPlaylist();
  act(() => mockPanel.onImportM3U([stream]));
  expect(mockPlaylist.appendItem).toHaveBeenCalled();
  expect(mockPanel.isOpen).toBe(false);
});

test('closes the compact playlist after successful magnet addition', async () => {
  render(<LightBirdPlayer />);
  openPlaylist();
  await act(async () => { expect(await mockPanel.onAddMagnet('magnet:?xt=example')).toBe(true); });
  expect(mockPanel.isOpen).toBe(false);
});

test('keeps the playlist open when magnet addition fails', async () => {
  mockAddMagnet.mockRejectedValueOnce(new Error('torrent unavailable'));
  render(<LightBirdPlayer />);
  openPlaylist();
  await act(async () => { await expect(mockPanel.onAddMagnet('magnet:?xt=example')).rejects.toThrow('torrent unavailable'); });
  expect(mockPanel.isOpen).toBe(true);
});

test('closes the compact playlist after disclaimer acceptance and successful magnet addition', async () => {
  jest.mocked(hasAcceptedDisclaimer).mockReturnValue(false);
  render(<LightBirdPlayer />);
  openPlaylist();
  await act(async () => { expect(await mockPanel.onAddMagnet('magnet:?xt=example')).toBe(false); });
  expect(mockPanel.isOpen).toBe(true);
  jest.mocked(hasAcceptedDisclaimer).mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /I Understand/ })); });
  expect(acceptDisclaimer).toHaveBeenCalled();
  expect(mockAddMagnet).toHaveBeenCalledTimes(1);
  expect(mockPanel.isOpen).toBe(false);
});
