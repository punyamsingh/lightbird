"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { PlaylistItem, AudioTrack } from "lightbird";
import { cn } from "./utils/cn";
import PlayerControls from "./player-controls";
import PlaylistPanel, { type PlaylistSize } from "./playlist-panel";
import { VideoOverlay } from "./video-overlay";
import { PlayerErrorDisplay } from "./player-error-display";
import { VideoInfoPanel } from "./video-info-panel";
import { ShortcutSettingsDialog } from "./shortcut-settings-dialog";
import { useToast } from "./hooks/use-toast";
import { createVideoPlayer, type VideoPlayer, CancellationError } from "lightbird";
import {
  useVideoPlayback,
  useVideoFilters,
  useSubtitles,
  usePlaylist,
  useKeyboardShortcuts,
  useFullscreen,
  usePictureInPicture,
  useProgressPersistence,
  useVideoInfo,
  useMediaSession,
  useChapters,
} from "lightbird/react";
import { captureVideoThumbnail, parseMediaError, validateFile, type ParsedMediaError, loadShortcuts, type ShortcutBinding, ProgressEstimator } from "lightbird";
import { SubtitleOverlay } from "./subtitle-overlay";

const MAX_RETRIES = 3;

const LightBirdPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<VideoPlayer | null>(null);
  // Companion map: preserves external subtitle files for re-loading playlist items
  const subtitleFilesMapRef = useRef<Map<string, File[]>>(new Map());
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamStallDetectorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStreamRef = useRef(false);

  const { toast } = useToast();
  const playlist = usePlaylist();
  const playback = useVideoPlayback(videoRef);
  const filters = useVideoFilters(videoRef);
  const subtitles = useSubtitles({
    onError: (msg) => toast({ title: msg, variant: "destructive" }),
    onSuccess: (msg) => toast({ title: msg }),
  });
  const fullscreen = useFullscreen(containerRef);
  const pip = usePictureInPicture(videoRef);
  const { metadata: videoMetadata } = useVideoInfo(videoRef, playlist.currentItem?.file ?? null);
  useProgressPersistence(videoRef, playlist.currentItem?.name ?? null);
  const { chapters, currentChapter, goToChapter } = useChapters(videoRef, playerRef);

  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(() => loadShortcuts());
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const progressEstimatorRef = useRef<ProgressEstimator | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingEta, setProcessingEta] = useState<number | null>(null);
  const [processingThroughput, setProcessingThroughput] = useState<number | null>(null);
  const [playerError, setPlayerError] = useState<ParsedMediaError | null>(null);
  const [cancellableProcessing, setCancellableProcessing] = useState(false);
  const [mediaThumbnail, setMediaThumbnail] = useState<string | null>(null);
  const [tracksLoading, setTracksLoading] = useState(false);

  const shortcutHandlers = useMemo(() => ({
    'play-pause': () => playback.togglePlay(),
    'seek-forward-5': () => { const el = videoRef.current; if (el) playback.seek(el.currentTime + 5); },
    'seek-backward-5': () => { const el = videoRef.current; if (el) playback.seek(el.currentTime - 5); },
    'seek-forward-30': () => { const el = videoRef.current; if (el) playback.seek(el.currentTime + 30); },
    'seek-backward-30': () => { const el = videoRef.current; if (el) playback.seek(el.currentTime - 30); },
    'volume-up': () => { const el = videoRef.current; if (el) playback.setVolume(Math.min(1, el.volume + 0.05)); },
    'volume-down': () => { const el = videoRef.current; if (el) playback.setVolume(Math.max(0, el.volume - 0.05)); },
    'mute': () => playback.toggleMute(),
    'fullscreen': () => fullscreen.toggle(),
    'next-item': () => handleNext(),
    'prev-item': () => handlePrevious(),
    'screenshot': () => captureScreenshot(),
    'show-shortcuts': () => setShowShortcutsHelp((v: boolean) => !v),
    'next-chapter': () => {
      const el = videoRef.current;
      if (!el || chapters.length === 0) return;
      const next = chapters.find((c) => c.startTime > el.currentTime);
      if (next) el.currentTime = next.startTime;
    },
    'prev-chapter': () => {
      const el = videoRef.current;
      if (!el || chapters.length === 0) return;
      const cur = currentChapter;
      if (!cur) return;
      // If we're more than 3s into the current chapter, restart it
      if (el.currentTime > cur.startTime + 3) {
        el.currentTime = cur.startTime;
      } else {
        const prev = chapters[cur.index - 1];
        if (prev) el.currentTime = prev.startTime;
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [playback.togglePlay, playback.seek, playback.setVolume, playback.toggleMute, fullscreen.toggle, chapters, currentChapter]);

  useKeyboardShortcuts(shortcuts, shortcutHandlers);

  const stopStallDetection = () => {
    if (streamStallDetectorRef.current) {
      clearInterval(streamStallDetectorRef.current);
      streamStallDetectorRef.current = null;
    }
  };

  const startStallDetection = () => {
    stopStallDetection();
    let lastTime = -1;
    streamStallDetectorRef.current = setInterval(() => {
      const el = videoRef.current;
      if (!el) return;
      const current = el.currentTime;
      if (!el.paused && current === lastTime) {
        // Stream appears stalled — attempt reload from current position
        const resumeAt = current;
        el.load();
        el.addEventListener(
          "canplay",
          () => {
            el.currentTime = resumeAt;
            el.play().catch(() => {});
          },
          { once: true }
        );
      }
      lastTime = current;
    }, 5000);
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const [playlistOpen, setPlaylistOpen] = useState(true);
  const [playlistPinned, setPlaylistPinned] = useState(false);
  const [playlistSize, setPlaylistSize] = useState<PlaylistSize>("md");
  // Tracks whether the sidebar was auto-hidden due to playback (vs. user action)
  const wasAutoHiddenRef = useRef(false);

  const processFile = useCallback(async (file: File, subtitleFiles: File[] = []) => {
    setIsLoading(true);
    setLoadingMessage("Initializing player...");
    setProcessingProgress(0);
    setPlayerError(null);
    setTracksLoading(false);
    progressEstimatorRef.current = new ProgressEstimator(file.size);
    setProcessingEta(null);
    setProcessingThroughput(null);
    retryCountRef.current = 0;
    isStreamRef.current = false;
    stopStallDetection();
    try {
      playerRef.current?.destroy();
      subtitles.reset();
      const player = createVideoPlayer(file, subtitleFiles, (progress) => {
        progressEstimatorRef.current?.update(progress);
        const est = progressEstimatorRef.current?.getEstimate();

        setProcessingProgress(progress);
        if (progress < 1) {
          setLoadingMessage(`Processing video… ${Math.round(progress * 100)}%`);
          setProcessingEta(est?.etaSeconds ?? null);
          setProcessingThroughput(est && est.speedMBps > 0 ? est.speedMBps : null);
        }
      });
      playerRef.current = player;
      setCancellableProcessing(true);
      try {
        if (!videoRef.current) throw new Error("Video element not available");
        setLoadingMessage("Loading video...");
        await player.initialize(videoRef.current);
      } finally {
        setCancellableProcessing(false);
      }
      subtitles.initManager(videoRef.current!);
      subtitles.importSubtitles(player.getSubtitles());
      const newAudioTracks = player.getAudioTracks();
      setAudioTracks(newAudioTracks);
      setActiveAudioTrack(newAudioTracks[0]?.id || "0");
      setIsLoading(false);
      setLoadingMessage("");
      setProcessingProgress(0);

      // On the MKV native path the probe runs after initialize() returns.
      // Show a small loader on the audio/subtitle buttons while it's in flight.
      if (player.tracksReady) {
        setTracksLoading(true);
        player.tracksReady.then(() => {
          if (playerRef.current !== player) { setTracksLoading(false); return; }
          subtitles.importSubtitles(player.getSubtitles());
          const updatedTracks = player.getAudioTracks();
          setAudioTracks(updatedTracks);
          setActiveAudioTrack(updatedTracks[0]?.id || "0");
          setTracksLoading(false);
        }).catch(() => { setTracksLoading(false); });
      }
    } catch (error) {
      if (!(error instanceof CancellationError)) {
        console.error(error);
        toast({
          title: "Failed to process video",
          description: "There was an error loading the video file. It might be an unsupported format.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
      setLoadingMessage("");
      setProcessingProgress(0);
    } finally {
      progressEstimatorRef.current = null;
      setProcessingEta(null);
      setProcessingThroughput(null);
    }
  }, [subtitles, toast]);

  const handleCancelProcessing = useCallback(() => {
    playerRef.current?.cancel?.();
    playerRef.current = null;
    setCancellableProcessing(false);
    setIsLoading(false);
    setLoadingMessage('');
    setProcessingProgress(0);
  }, []);

  const loadVideo = useCallback((index: number) => {
    const item = playlist.playlist[index];
    if (!item) return;
    playlist.selectItem(index);
    setPlayerError(null);
    clearRetryTimer();
    retryCountRef.current = 0;
    if (item.type === "stream") {
      playerRef.current?.destroy();
      playerRef.current = null;
      if (videoRef.current) videoRef.current.src = item.url;
      subtitles.reset();
      setAudioTracks([]);
      setActiveAudioTrack("0");
      isStreamRef.current = true;
      startStallDetection();
    } else if (item.file) {
      isStreamRef.current = false;
      stopStallDetection();
      const subs = subtitleFilesMapRef.current.get(item.name) ?? [];
      processFile(item.file, subs);
    }
  }, [playlist.playlist, playlist.selectItem, subtitles, processFile]);

  const handleSkipToNext = useCallback(() => {
    setPlayerError(null);
    clearRetryTimer();
    if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
      loadVideo((playlist.currentIndex + 1) % playlist.playlist.length);
    }
  }, [playlist.currentIndex, playlist.playlist.length, loadVideo]);

  const handleRetry = useCallback(() => {
    setPlayerError(null);
    clearRetryTimer();
    retryCountRef.current = 0;
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  const handleDismissError = useCallback(() => {
    setPlayerError(null);
    clearRetryTimer();
  }, []);

  // Handle video errors
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onError = () => {
      const parsed = parseMediaError(el.error ?? null);
      setPlayerError(parsed);

      if (parsed.retryable && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        retryTimerRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          el.load();
        }, delay);
      } else if (!parsed.recoverable) {
        toast({ title: "Skipping unplayable file", description: parsed.message });
        if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
          loadVideo((playlist.currentIndex + 1) % playlist.playlist.length);
        }
      }
    };
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.currentIndex, playlist.playlist.length]);

  // Handle video ended: loop or advance playlist
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onEnded = () => {
      if (playback.loop) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
        loadVideo((playlist.currentIndex + 1) % playlist.playlist.length);
      }
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [playback.loop, playlist.currentIndex, playlist.playlist.length, loadVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      clearRetryTimer();
      stopStallDetection();
    };
  }, []);

  // Capture thumbnail for media session artwork, scoped to the current playlist item
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playlist.currentItem) {
      setMediaThumbnail(null);
      return;
    }
    setMediaThumbnail(null);
    let cancelled = false;
    const onLoadedData = () => {
      captureVideoThumbnail(el).then((dataUrl) => {
        if (!cancelled) setMediaThumbnail(dataUrl);
      });
    };
    el.addEventListener("loadeddata", onLoadedData);
    return () => {
      cancelled = true;
      el.removeEventListener("loadeddata", onLoadedData);
    };
  }, [playlist.currentItem]);

  // Auto-hide the playlist sidebar when playing (unless pinned); restore when paused
  useEffect(() => {
    if (playback.isPlaying) {
      if (!playlistPinned) {
        setPlaylistOpen((current: boolean) => {
          if (current) wasAutoHiddenRef.current = true;
          return current ? false : current;
        });
      }
    } else if (wasAutoHiddenRef.current) {
      setPlaylistOpen(true);
      wasAutoHiddenRef.current = false;
    }
  }, [playback.isPlaying, playlistPinned]);

  const handleFileChange = async (files: FileList) => {
    const { videoFiles, subtitleFiles } = playlist.parseFiles(files);
    if (videoFiles.length === 0) return;

    const validVideoFiles: File[] = [];
    for (const file of videoFiles) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({ title: "Cannot load file", description: validation.reason, variant: "destructive" });
      } else {
        validVideoFiles.push(file);
      }
    }
    if (validVideoFiles.length === 0) return;

    if (subtitleFiles.length > 0) {
      subtitleFilesMapRef.current.set(validVideoFiles[0].name, subtitleFiles);
    }

    const prevLen = playlist.playlist.length;
    await playlist.addFiles(validVideoFiles);

    // If nothing is playing, start the first newly added file
    if (playlist.currentIndex === null) {
      playlist.selectItem(prevLen);
      await processFile(validVideoFiles[0], subtitleFiles);
    }
  };

  const handleFolderFilesAdded = useCallback(
    async (files: File[]) => {
      const prevLen = playlist.playlist.length;
      await playlist.addFiles(files);
      // Auto-load the first added file if nothing is playing
      if (playlist.currentIndex === null && files.length > 0) {
        const newIndex = prevLen;
        playlist.selectItem(newIndex);
        await processFile(files[0]);
      }
    },
    [playlist, processFile]
  );

  const handleRemoveItem = useCallback((index: number) => {
    playlist.removeItem(index);
  }, [playlist]);

  const handleReorder = useCallback(
    (newPlaylist: PlaylistItem[]) => {
      playlist.reorderItems(newPlaylist);
    },
    [playlist]
  );

  const handleImportM3U = useCallback(
    (items: Omit<PlaylistItem, "id">[]) => {
      items.forEach((item) => {
        playlist.appendItem({ ...item, id: crypto.randomUUID() });
      });
      if (playlist.currentIndex === null && items.length > 0) {
        const firstStream = items.find((i) => i.type === "stream");
        if (firstStream && videoRef.current) {
          playlist.selectItem(0);
          videoRef.current.src = firstStream.url;
          subtitles.reset();
        }
      }
    },
    [playlist, subtitles]
  );

  const handleAddStream = useCallback((url: string, name?: string) => {
    const newIndex = playlist.playlist.length;
    const newItem: PlaylistItem = {
      id: crypto.randomUUID(),
      name: name || `Stream ${newIndex + 1}`,
      url,
      type: "stream",
    };
    playlist.appendItem(newItem);
    if (playlist.currentIndex === null) {
      playlist.selectItem(newIndex);
      if (videoRef.current) videoRef.current.src = url;
      subtitles.reset();
      setAudioTracks([]);
      setActiveAudioTrack("0");
      isStreamRef.current = true;
      startStallDetection();
    }
  }, [playlist, subtitles]);

  const handleSubtitleChange = useCallback(async (id: string) => {
    subtitles.switchSubtitle(id);
    if (playerRef.current) {
      try {
        await playerRef.current.switchSubtitle(id);
      } catch (error) {
        console.error("Player subtitle switch failed:", error);
      }
    }
  }, [subtitles]);

  const handleAudioTrackChange = useCallback(async (id: string) => {
    if (!playerRef.current) return;
    try {
      setIsLoading(true);
      setLoadingMessage("Switching audio track...");
      await playerRef.current.switchAudioTrack(id);
      setActiveAudioTrack(id);
    } catch (error) {
      console.error("Failed to switch audio track:", error);
      toast({ title: "Failed to switch audio track", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [toast]);

  const captureScreenshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = video.style.filter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `lightbird-screenshot-${new Date().toISOString()}.png`;
    a.click();
    toast({ title: "Screenshot Saved" });
  }, [toast]);

  const handleNext = useCallback(() => {
    if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
      loadVideo((playlist.currentIndex + 1) % playlist.playlist.length);
    }
  }, [playlist.currentIndex, playlist.playlist.length, loadVideo]);

  const handlePrevious = useCallback(() => {
    if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
      loadVideo((playlist.currentIndex - 1 + playlist.playlist.length) % playlist.playlist.length);
    }
  }, [playlist.currentIndex, playlist.playlist.length, loadVideo]);

  const handleSubtitleUpload = useCallback(() => {
    subtitleInputRef.current?.click();
  }, []);

  const handleSelectVideo = useCallback((index: number) => {
    loadVideo(index);
  }, [loadVideo]);

  const handlePlaylistToggle = () => {
    wasAutoHiddenRef.current = false;
    setPlaylistOpen((v: boolean) => !v);
  };

  const handleMediaPlay = useCallback(() => {
    const el = videoRef.current;
    if (el) el.play().catch(() => {});
  }, []);

  const handleMediaPause = useCallback(() => {
    const el = videoRef.current;
    if (el) el.pause();
  }, []);

  const handleMediaSeekForward = useCallback(() => {
    const el = videoRef.current;
    if (el) playback.seek(el.currentTime + 10);
  }, [playback.seek]);

  const handleMediaSeekBackward = useCallback(() => {
    const el = videoRef.current;
    if (el) playback.seek(el.currentTime - 10);
  }, [playback.seek]);

  useMediaSession({
    title: playlist.currentItem?.name ?? null,
    artwork: mediaThumbnail,
    onPlay: handleMediaPlay,
    onPause: handleMediaPause,
    onNext: handleNext,
    onPrev: handlePrevious,
    onSeekForward: handleMediaSeekForward,
    onSeekBackward: handleMediaSeekBackward,
  });

  return (
    <div className="flex flex-1 w-full h-full">
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center bg-black relative group"
      >
        <video
          ref={videoRef}
          className={cn("w-full h-full object-contain transition-all duration-300", isLoading && "invisible")}
          loop={playback.loop}
          onClick={playback.togglePlay}
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />
        <SubtitleOverlay videoRef={videoRef} activeSubtitle={subtitles.activeSubtitle} />
        <VideoOverlay
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          processingProgress={processingProgress}
          eta={processingEta}
          throughputMBs={processingThroughput}
          onCancel={cancellableProcessing ? handleCancelProcessing : undefined}
        />

        {playerError && (
          <PlayerErrorDisplay
            error={playerError}
            onRetry={playerError.retryable ? handleRetry : undefined}
            onSkip={handleSkipToNext}
            onDismiss={handleDismissError}
          />
        )}

        {showInfo && (
          <VideoInfoPanel
            metadata={videoMetadata}
            onClose={() => setShowInfo(false)}
          />
        )}

        {showShortcutsHelp && (
          <div
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setShowShortcutsHelp(false)}
          >
            <div
              className="bg-card rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {shortcuts.map((b: import("lightbird").ShortcutBinding) => {
                  const mods: string[] = [];
                  if (b.modifiers?.ctrl) mods.push("Ctrl");
                  if (b.modifiers?.shift) mods.push("Shift");
                  if (b.modifiers?.alt) mods.push("Alt");
                  const keyLabel = b.key === " " ? "Space" : b.key;
                  const formatted = [...mods, keyLabel].join(" + ");
                  return (
                    <div key={b.action} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{b.label}</span>
                      <kbd className="font-mono bg-muted px-1.5 rounded text-xs">{formatted}</kbd>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">Press ? or click outside to close</p>
            </div>
          </div>
        )}

        {playlist.currentItem && (
          <PlayerControls
            isPlaying={playback.isPlaying}
            progress={playback.progress}
            duration={playback.duration}
            volume={playback.volume}
            isMuted={playback.isMuted}
            playbackRate={playback.playbackRate}
            loop={playback.loop}
            isFullScreen={fullscreen.isFullscreen}
            filters={filters.filters}
            zoom={filters.zoom}
            subtitles={subtitles.subtitles}
            activeSubtitle={subtitles.activeSubtitle}
            audioTracks={audioTracks}
            activeAudioTrack={activeAudioTrack}
            tracksLoading={tracksLoading}
            onPlayPause={playback.togglePlay}
            onSeek={playback.seek}
            onVolumeChange={playback.setVolume}
            onMuteToggle={playback.toggleMute}
            onPlaybackRateChange={playback.setPlaybackRate}
            onLoopToggle={playback.toggleLoop}
            onFullScreenToggle={fullscreen.toggle}
            onFrameStep={playback.frameStep}
            onScreenshot={captureScreenshot}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onFiltersChange={filters.setFilters}
            onZoomChange={filters.setZoom}
            onSubtitleChange={handleSubtitleChange}
            onAudioTrackChange={handleAudioTrackChange}
            onSubtitleUpload={handleSubtitleUpload}
            onSubtitleRemove={subtitles.removeSubtitle}
            onShowInfo={() => setShowInfo((v: boolean) => !v)}
            onOpenShortcuts={() => setShowShortcutsDialog(true)}
            chapters={chapters}
            currentChapter={currentChapter}
            onGoToChapter={goToChapter}
            onTogglePiP={pip.toggle}
            isPiP={pip.isPiP}
            pipSupported={!!pip.isSupported}
          />
        )}

        {showShortcutsDialog && (
          <ShortcutSettingsDialog
            shortcuts={shortcuts}
            onSave={(updated) => setShortcuts(updated)}
            onClose={() => setShowShortcutsDialog(false)}
          />
        )}

        <input
          type="file"
          ref={subtitleInputRef}
          className="hidden"
          multiple
          accept=".vtt,.srt,.ass,.ssa"
          onChange={(e) => {
            if (e.target.files) subtitles.addSubtitleFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />

        {!playlist.currentItem && !isLoading && !loadingMessage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-2xl font-semibold">LightBird Player</p>
              <p>Add a local file or stream to begin.</p>
            </div>
          </div>
        )}
      </div>

      <PlaylistPanel
        playlist={playlist.playlist}
        currentVideoIndex={playlist.currentIndex}
        onSelectVideo={handleSelectVideo}
        onFilesAdded={handleFileChange}
        onFolderFilesAdded={handleFolderFilesAdded}
        onAddStream={handleAddStream}
        onRemoveItem={handleRemoveItem}
        onReorder={handleReorder}
        onImportM3U={handleImportM3U}
        isOpen={playlistOpen}
        isPinned={playlistPinned}
        size={playlistSize}
        onToggle={handlePlaylistToggle}
        onTogglePin={() => setPlaylistPinned((v: boolean) => !v)}
        onSizeChange={setPlaylistSize}
      />
    </div>
  );
};

export default LightBirdPlayer;
