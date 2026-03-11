"use client";

import React, { useState, useRef, useEffect } from "react";
import type { PlaylistItem, AudioTrack } from "@/types";
import { cn } from "@/lib/utils";
import PlayerControls from "@/components/player-controls";
import PlaylistPanel from "@/components/playlist-panel";
import { VideoOverlay } from "@/components/video-overlay";
import { useToast } from "@/hooks/use-toast";
import { createVideoPlayer, type VideoPlayer } from "@/lib/video-processor";
import { useVideoPlayback } from "@/hooks/use-video-playback";
import { useVideoFilters } from "@/hooks/use-video-filters";
import { useSubtitles } from "@/hooks/use-subtitles";
import { usePlaylist } from "@/hooks/use-playlist";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useProgressPersistence } from "@/hooks/use-progress-persistence";

const LightBirdPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<VideoPlayer | null>(null);

  const { toast } = useToast();
  const playlist = usePlaylist();
  const playback = useVideoPlayback(videoRef);
  const filters = useVideoFilters(videoRef);
  const subtitles = useSubtitles();
  const fullscreen = useFullscreen(containerRef);
  useKeyboardShortcuts(playback, fullscreen);
  useProgressPersistence(videoRef, playlist.currentItem?.name ?? null);

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);

  const processFile = async (file: File, subtitleFiles: File[] = []) => {
    setIsLoading(true);
    setLoadingMessage("Initializing player...");
    setProcessingProgress(0);
    try {
      playerRef.current?.destroy();
      subtitles.reset();
      const player = createVideoPlayer(file, subtitleFiles, (progress) => {
        setProcessingProgress(progress);
        if (progress < 1) {
          setLoadingMessage(`Processing video… ${Math.round(progress * 100)}%`);
        }
      });
      playerRef.current = player;
      if (!videoRef.current) throw new Error("Video element not available");
      setLoadingMessage("Loading video...");
      await player.initialize(videoRef.current);
      subtitles.initManager(videoRef.current);
      subtitles.importSubtitles(player.getSubtitles());
      const newAudioTracks = player.getAudioTracks();
      setAudioTracks(newAudioTracks);
      setActiveAudioTrack(newAudioTracks[0]?.id || "0");
      setIsLoading(false);
      setLoadingMessage("");
      setProcessingProgress(0);
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to process video",
        description: "There was an error loading the video file. It might be an unsupported format.",
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingMessage("");
      setProcessingProgress(0);
    }
  };

  const loadVideo = (index: number) => {
    const item = playlist.playlist[index];
    if (!item) return;
    playlist.selectItem(index);
    if (item.type === "stream") {
      playerRef.current?.destroy();
      playerRef.current = null;
      if (videoRef.current) videoRef.current.src = item.url;
      subtitles.reset();
      setAudioTracks([]);
      setActiveAudioTrack("0");
    } else if (item.file) {
      processFile(item.file);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.loop, playlist.currentIndex, playlist.playlist.length]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => { playerRef.current?.destroy(); };
  }, []);

  const handleFileChange = async (files: FileList) => {
    const { videoFiles, subtitleFiles } = playlist.parseFiles(files);
    if (videoFiles.length === 0) return;
    const videoFile = videoFiles[0];
    playlist.replaceWithFile(videoFile);
    await processFile(videoFile, subtitleFiles);
  };

  const handleAddStream = (url: string, name?: string) => {
    const newIndex = playlist.playlist.length;
    const newItem: PlaylistItem = {
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
    }
  };

  const handleSubtitleChange = async (id: string) => {
    subtitles.switchSubtitle(id);
    if (playerRef.current) {
      try {
        await playerRef.current.switchSubtitle(id);
      } catch (error) {
        console.error("Player subtitle switch failed:", error);
      }
    }
  };

  const handleAudioTrackChange = async (id: string) => {
    setActiveAudioTrack(id);
    if (!playerRef.current) return;
    try {
      setIsLoading(true);
      setLoadingMessage("Switching audio track...");
      await playerRef.current.switchAudioTrack(id);
      setIsLoading(false);
      setLoadingMessage("");
    } catch (error) {
      console.error("Failed to switch audio track:", error);
      toast({ title: "Failed to switch audio track", variant: "destructive" });
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const captureScreenshot = () => {
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
  };

  const handleNext = () => {
    if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
      loadVideo((playlist.currentIndex + 1) % playlist.playlist.length);
    }
  };

  const handlePrevious = () => {
    if (playlist.currentIndex !== null && playlist.playlist.length > 1) {
      loadVideo((playlist.currentIndex - 1 + playlist.playlist.length) % playlist.playlist.length);
    }
  };

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
        <VideoOverlay
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          processingProgress={processingProgress}
        />

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
            onSubtitleUpload={() => subtitleInputRef.current?.click()}
            onSubtitleRemove={subtitles.removeSubtitle}
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
        onSelectVideo={loadVideo}
        onFilesAdded={handleFileChange}
        onAddStream={handleAddStream}
      />
    </div>
  );
};

export default LightBirdPlayer;
