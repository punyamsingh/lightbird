"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { PlaylistItem, Subtitle, VideoFilters } from "@/types";
import { cn } from "@/lib/utils";
import PlayerControls from "@/components/player-controls";
import PlaylistPanel from "@/components/playlist-panel";
import { useToast } from "@/hooks/use-toast";

const NovaPlayer = () => {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("off");

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<VideoFilters>({ brightness: 100, contrast: 100, saturate: 100, hue: 0 });
  const [zoom, setZoom] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();

  const currentVideo = currentVideoIndex !== null ? playlist[currentVideoIndex] : null;

  const applyFilters = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) hue-rotate(${filters.hue}deg)`;
      videoRef.current.style.transform = `scale(${zoom})`;
    }
  }, [filters, zoom]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadVideo = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      const video = playlist[index];
      if (videoRef.current) {
        setIsLoading(true);
        videoRef.current.src = video.url;
        videoRef.current.load();
        const savedTime = localStorage.getItem(`novaplayer-${video.name}`);
        if (savedTime) {
          videoRef.current.currentTime = parseFloat(savedTime);
        }
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
      setCurrentVideoIndex(index);
      setSubtitles([]);
      setActiveSubtitle("off");
    }
  };

  const handleFileChange = (files: FileList) => {
    const videoFiles: File[] = [];
    const subtitleFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith("video/")) {
        videoFiles.push(file);
      } else if (file.name.endsWith(".vtt") || file.name.endsWith(".srt")) {
        subtitleFiles.push(file);
      }
    });

    const newPlaylistItems: PlaylistItem[] = videoFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: 'video',
    }));
    
    setPlaylist(prev => [...prev, ...newPlaylistItems]);
    
    if (currentVideoIndex === null && newPlaylistItems.length > 0) {
      loadVideo(playlist.length);
    }

    // Auto-load subtitles
    if (videoFiles.length === 1 && subtitleFiles.length > 0) {
        const videoName = videoFiles[0].name.split('.').slice(0, -1).join('.');
        const matchingSub = subtitleFiles.find(sub => sub.name.startsWith(videoName));
        if (matchingSub) {
            const newSub: Subtitle = { name: matchingSub.name, lang: 'en', url: URL.createObjectURL(matchingSub) };
            setSubtitles([newSub]);
            setActiveSubtitle(newSub.url);
        }
    } else {
        const newSubs = subtitleFiles.map((sub, i) => ({name: sub.name, lang: `sub${i+1}`, url: URL.createObjectURL(sub)}));
        setSubtitles(s => [...s, ...newSubs]);
    }
  };

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setProgress(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handlePlaybackRateChange = (rate: number) => {
      if(videoRef.current) {
          videoRef.current.playbackRate = rate;
          setPlaybackRate(rate);
      }
  }

  const handleFrameStep = (direction: 'forward' | 'backward') => {
      if(videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
        const frameTime = 1 / (playbackRate * 30); // Assume 30fps
        videoRef.current.currentTime += direction === 'forward' ? frameTime : -frameTime;
      }
  }

  const handleNext = useCallback(() => {
      if (currentVideoIndex !== null) {
          const nextIndex = (currentVideoIndex + 1) % playlist.length;
          loadVideo(nextIndex);
      }
  }, [currentVideoIndex, playlist.length]);
  
  const handlePrevious = () => {
      if (currentVideoIndex !== null) {
          const prevIndex = (currentVideoIndex - 1 + playlist.length) % playlist.length;
          loadVideo(prevIndex);
      }
  };

  const toggleFullScreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  const captureScreenshot = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.filter = video.style.filter;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `nova-screenshot-${new Date().toISOString()}.png`;
            a.click();
            toast({ title: "Screenshot Saved" });
        }
    }
  };
  
  useEffect(() => {
    const video = videoRef.current;
    const container = playerContainerRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
        setProgress(video.currentTime);
        if(currentVideo) {
            localStorage.setItem(`novaplayer-${currentVideo.name}`, String(video.currentTime));
        }
    };
    const onLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
    };
    const onEnded = () => {
        if (!loop) {
            handleNext();
        }
    };
    const onFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    container?.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      container?.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [currentVideo, loop, handleNext]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                handlePlayPause();
                break;
            case 'ArrowRight':
                e.preventDefault();
                handleSeek(progress + 5);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                handleSeek(progress - 5);
                break;
            case 'ArrowUp':
                e.preventDefault();
                handleVolumeChange(Math.min(1, volume + 0.1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                handleVolumeChange(Math.max(0, volume - 0.1));
                break;
            case 'KeyM':
                e.preventDefault();
                handleMuteToggle();
                break;
            case 'KeyF':
                e.preventDefault();
                toggleFullScreen();
                break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, progress, volume]);


  return (
    <div className="flex flex-1 w-full h-full">
      <div
        ref={playerContainerRef}
        className="flex-1 flex flex-col items-center justify-center bg-black relative group"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain transition-all duration-300"
          loop={loop}
          onClick={handlePlayPause}
        >
          {subtitles.map(sub => (
            <track
              key={sub.url}
              kind="subtitles"
              srcLang={sub.lang}
              src={sub.url}
              label={sub.name}
              mode={activeSubtitle === sub.url ? "showing" : "hidden"}
            />
          ))}
        </video>
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
            </div>
        )}

        {currentVideo && (
             <PlayerControls
                isPlaying={isPlaying}
                progress={progress}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                playbackRate={playbackRate}
                loop={loop}
                isFullScreen={isFullScreen}
                filters={filters}
                zoom={zoom}
                subtitles={subtitles}
                activeSubtitle={activeSubtitle}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onPlaybackRateChange={handlePlaybackRateChange}
                onLoopToggle={() => setLoop(!loop)}
                onFullScreenToggle={toggleFullScreen}
                onFrameStep={handleFrameStep}
                onScreenshot={captureScreenshot}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onFiltersChange={setFilters}
                onZoomChange={setZoom}
                onSubtitleChange={setActiveSubtitle}
             />
        )}
       
        {!currentVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-2xl font-semibold">NOVA Player</p>
                    <p>Select a video from the playlist to begin.</p>
                </div>
            </div>
        )}
      </div>
      <PlaylistPanel
        playlist={playlist}
        currentVideoIndex={currentVideoIndex}
        onSelectVideo={loadVideo}
        onFilesAdded={handleFileChange}
        onAddStream={(url, name) => {
            const newItem: PlaylistItem = {name: name || `Stream ${playlist.length + 1}`, url, type: 'stream' };
            setPlaylist(p => [...p, newItem]);
            if(currentVideoIndex === null) {
                loadVideo(playlist.length);
            }
        }}
      />
    </div>
  );
};

export default NovaPlayer;
