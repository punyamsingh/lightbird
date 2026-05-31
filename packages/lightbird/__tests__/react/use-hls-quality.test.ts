import { renderHook, act } from '@testing-library/react'
import type { RefObject } from 'react'

// hls.js is dynamically imported inside HLSPlayer.initialize(); mock it so the
// real streaming engine never loads and we can drive events from the test.
jest.mock('hls.js', () => {
  const instances: MockHls[] = []

  const Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
  }

  class MockHls {
    static isSupported = jest.fn(() => true)
    static instances = instances
    static Events = Events
    static reset() {
      instances.length = 0
      MockHls.isSupported.mockReset()
      MockHls.isSupported.mockReturnValue(true)
    }

    loadSource = jest.fn()
    attachMedia = jest.fn()
    destroy = jest.fn()
    audioTracks: Array<{ id: number; name: string; lang?: string }> = []
    levels: Array<{ height: number; bitrate: number; name: string }> = []
    audioTrack = -1
    currentLevel = -1

    private listeners = new Map<string, Set<(...args: unknown[]) => void>>()
    on = jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set())
      this.listeners.get(event)!.add(cb)
    })
    off = jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      this.listeners.get(event)?.delete(cb)
    })
    emit(event: string) {
      this.listeners.get(event)?.forEach((cb) => cb())
    }

    constructor() {
      instances.push(this)
    }
  }

  return { __esModule: true, default: MockHls }
})

import HlsImport from 'hls.js'
import { HLSPlayer } from '../../src/players/hls-player'
import type { VideoPlayer } from '../../src/video-processor'
import { useHlsQuality } from '../../src/react/use-hls-quality'

const MockHls = HlsImport as unknown as {
  isSupported: jest.Mock
  reset: () => void
  Events: { MANIFEST_PARSED: string; LEVEL_SWITCHED: string }
  instances: Array<{
    levels: Array<{ height: number; bitrate: number; name: string }>
    currentLevel: number
    emit: (event: string) => void
  }>
}

const HLS_URL = 'https://example.com/stream.m3u8'

function refTo(player: VideoPlayer | null): RefObject<VideoPlayer | null> {
  return { current: player }
}

async function loadHlsPlayer(): Promise<HLSPlayer> {
  const player = new HLSPlayer(HLS_URL)
  await player.initialize(document.createElement('video'))
  return player
}

beforeEach(() => {
  MockHls.reset()
})

describe('useHlsQuality', () => {
  it('returns empty levels and a no-op when the player is null', () => {
    const { result } = renderHook(() => useHlsQuality(refTo(null)))
    expect(result.current.qualityLevels).toEqual([])
    expect(result.current.currentLevel).toBe(-1)
    expect(() => result.current.setLevel(0)).not.toThrow()
  })

  it('returns empty levels when the player is not an HLSPlayer', () => {
    const notHls = {} as VideoPlayer
    const { result } = renderHook(() => useHlsQuality(refTo(notHls)))
    expect(result.current.qualityLevels).toEqual([])
    expect(result.current.currentLevel).toBe(-1)
  })

  it('exposes the renditions of a loaded HLS stream', async () => {
    const player = await loadHlsPlayer()
    MockHls.instances[0].levels = [
      { height: 1080, bitrate: 8_000_000, name: '1080p' },
      { height: 720, bitrate: 4_000_000, name: '720p' },
    ]
    const { result } = renderHook(() => useHlsQuality(refTo(player)))
    expect(result.current.qualityLevels).toEqual([
      { index: 0, height: 1080, bitrate: 8_000_000, name: '1080p' },
      { index: 1, height: 720, bitrate: 4_000_000, name: '720p' },
    ])
    expect(result.current.currentLevel).toBe(-1)
  })

  it('setLevel switches the underlying hls level', async () => {
    const player = await loadHlsPlayer()
    const hls = MockHls.instances[0]
    hls.levels = [
      { height: 1080, bitrate: 8_000_000, name: '1080p' },
      { height: 720, bitrate: 4_000_000, name: '720p' },
    ]
    const { result } = renderHook(() => useHlsQuality(refTo(player)))
    act(() => result.current.setLevel(1))
    expect(hls.currentLevel).toBe(1)
    expect(result.current.currentLevel).toBe(1)
  })

  it('keeps currentLevel in sync with LEVEL_SWITCHED events', async () => {
    const player = await loadHlsPlayer()
    const hls = MockHls.instances[0]
    hls.levels = [
      { height: 1080, bitrate: 8_000_000, name: '1080p' },
      { height: 720, bitrate: 4_000_000, name: '720p' },
    ]
    const { result } = renderHook(() => useHlsQuality(refTo(player)))
    act(() => {
      hls.currentLevel = 0
      hls.emit(MockHls.Events.LEVEL_SWITCHED)
    })
    expect(result.current.currentLevel).toBe(0)
  })
})
