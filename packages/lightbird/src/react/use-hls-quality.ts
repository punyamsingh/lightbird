import { useState, useEffect, useCallback, type RefObject } from 'react'
import { HLSPlayer } from '../players/hls-player'
import type { VideoPlayer } from '../video-processor'
import type { QualityLevel } from '../types'

export interface UseHlsQualityReturn {
  /** Available renditions. Empty unless an HLS stream with levels is loaded. */
  qualityLevels: QualityLevel[]
  /** Index of the active level, or -1 for automatic (ABR) selection. */
  currentLevel: number
  /** Switch to a level by index (-1 = auto). No-op when not playing HLS. */
  setLevel: (idx: number) => void
}

/**
 * Exposes the quality levels of the currently loaded HLS stream and lets the
 * caller switch between them. Returns an empty list and a no-op `setLevel` when
 * the player is not an {@link HLSPlayer}.
 *
 * The list and the active level are kept in sync via
 * {@link HLSPlayer.onMetadataChange}, which fires on manifest parse and on
 * every `LEVEL_SWITCHED` event.
 */
export function useHlsQuality(
  playerRef: RefObject<VideoPlayer | null>,
): UseHlsQualityReturn {
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [currentLevel, setCurrentLevel] = useState<number>(-1)

  // Read the current player on every render so the effect re-runs once the
  // player is created (the parent re-renders when the stream becomes ready).
  const player = playerRef.current

  useEffect(() => {
    if (!(player instanceof HLSPlayer)) {
      setQualityLevels([])
      setCurrentLevel(-1)
      return
    }

    const refresh = () => {
      setQualityLevels(player.getQualityLevels())
      setCurrentLevel(player.getCurrentLevel())
    }

    refresh()
    return player.onMetadataChange(refresh)
  }, [player])

  const setLevel = useCallback(
    (idx: number) => {
      const current = playerRef.current
      if (!(current instanceof HLSPlayer)) return
      current.setQualityLevel(idx)
      // Reflect the choice immediately; LEVEL_SWITCHED will confirm it.
      setCurrentLevel(idx)
    },
    [playerRef],
  )

  return { qualityLevels, currentLevel, setLevel }
}
