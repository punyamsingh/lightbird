"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { PlaylistItem, Subtitle, AudioTrack, VideoFilters } from "@/types";
import { cn } from "@/lib/utils";
import PlayerControls from "@/components/player-controls";
import PlaylistPanel from "@/components/playlist-panel";
import { useToast } from "@/hooks/use-toast";
import { createVideoPlayer, type VideoPlayer } from "@/lib/video-processor";
import { UniversalSubtitleManager } from "@/lib/subtitle-manager";

const LightBirdPlayer = () => {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("-1"); // -1 for off
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<string>("0");

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [filters, setFilters] = useState<VideoFilters>({ brightness: 100, contrast: 100, saturate: 100, hue: 0 });
  const [zoom, setZoom] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPlayerRef = useRef<VideoPlayer | null>(null);
  const subtitleManagerRef = useRef<UniversalSubtitleManager | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

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
      setCurrentVideoIndex(index);
      const video = playlist[index];
      if (video.type === 'stream') {
        // Clean up old player
        if (currentPlayerRef.current) {
          currentPlayerRef.current.destroy();
          currentPlayerRef.current = null;
        }
        
        if(videoRef.current) {
            videoRef.current.src = video.url;
        }
        setSubtitles([]);
        setAudioTracks([]);
        setActiveSubtitle('-1');
        setActiveAudioTrack('0');
      } else {
        if (video.file) {
            processFile(video.file);
        }
      }
    }
  };

  const processFile = async (file: File, subtitleFiles: File[] = []) => {
    setIsLoading(true);
    setLoadingMessage("Initializing player...");
    
    try {
        // Clean up old player and subtitle manager
        if (currentPlayerRef.current) {
          currentPlayerRef.current.destroy();
        }
        if (subtitleManagerRef.current) {
          subtitleManagerRef.current.destroy();
        }

        // Create new player based on file type
        const player = createVideoPlayer(file, subtitleFiles);
        currentPlayerRef.current = player;

        if (!videoRef.current) {
          throw new Error("Video element not available");
        }

        setLoadingMessage("Loading video...");
        
        // Initialize the player
        await player.initialize(videoRef.current);
        
        // Initialize universal subtitle manager
        const subtitleManager = new UniversalSubtitleManager(videoRef.current);
        subtitleManagerRef.current = subtitleManager;
        
        // Get tracks from the player
        const newAudioTracks = player.getAudioTracks();
        const playerSubtitleTracks = player.getSubtitles();
        
        // Import player subtitles into subtitle manager
        subtitleManager.importSubtitles(playerSubtitleTracks);
        
        // Get combined subtitles from manager
        const allSubtitles = subtitleManager.getSubtitles();
        
        setAudioTracks(newAudioTracks);
        setSubtitles(allSubtitles);
        
        // Set default active tracks
        const firstAudioTrackId = newAudioTracks[0]?.id || '0';
        setActiveAudioTrack(firstAudioTrackId);
        setActiveSubtitle('-1'); // Default to off

        setIsLoading(false);
        setLoadingMessage("");
    } catch(error) {
        console.error(error);
        toast({ 
          title: "Failed to process video", 
          description: "There was an error loading the video file. It might be an unsupported format.", 
          variant: "destructive" 
        });
        setIsLoading(false);
        setLoadingMessage("");
    }
  };

  const handleFileChange = async (files: FileList) => {
    const videoFiles: File[] = [];
    const subtitleFiles: File[] = [];
    const videoExtensions = ['.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mp4'];
    const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];

    Array.from(files).forEach(file => {
      const fileName = file.name.toLowerCase();
      const isVideo = file.type.startsWith("video/") || videoExtensions.some(ext => fileName.endsWith(ext));
      const isSubtitle = subtitleExtensions.some(ext => fileName.endsWith(ext));
      
      if (isVideo) {
        videoFiles.push(file);
      } else if (isSubtitle) {
        subtitleFiles.push(file);
      }
    });

    if (videoFiles.length === 0) return;
    
    // Clear the playlist and start fresh with the new file
    setPlaylist([]);
    const videoFile = videoFiles[0];

    const newPlaylistItem: PlaylistItem = {
      name: videoFile.name,
      url: URL.createObjectURL(videoFile),
      type: 'video',
      file: videoFile,
    };
    
    setPlaylist([newPlaylistItem]);
    setCurrentVideoIndex(0);
    
    // Create player with external subtitles if provided
    await processFile(videoFile, subtitleFiles);
  };

  const handleSubtitlesAdded = async (files: FileList, videoIndex: number) => {
    const targetVideo = playlist[videoIndex];
    
    if (!targetVideo?.file) {
      toast({
        title: "Invalid video",
        description: "Cannot add subtitles to this video.",
        variant: "destructive"
      });
      return;
    }

    const subtitleFiles: File[] = [];
    const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];

    Array.from(files).forEach(file => {
      const fileName = file.name.toLowerCase();
      const isSubtitle = subtitleExtensions.some(ext => fileName.endsWith(ext));
      if (isSubtitle) {
        subtitleFiles.push(file);
      }
    });

    if (subtitleFiles.length === 0) {
      toast({
        title: "No valid subtitle files",
        description: "Please select .srt, .vtt, .ass, or .ssa files.",
        variant: "destructive"
      });
      return;
    }

    // If this is the currently playing video, reload it with subtitles
    if (videoIndex === currentVideoIndex) {
      await processFile(targetVideo.file, subtitleFiles);
    }
    
    toast({
      title: "Subtitles added",
      description: `Added ${subtitleFiles.length} subtitle file(s) to ${targetVideo.name}.`
    });
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
  };

  const handleFrameStep = (direction: 'forward' | 'backward') => {
      if(videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
        const frameTime = 1 / (playbackRate * 30); // Assume 30fps
        videoRef.current.currentTime += direction === 'forward' ? frameTime : -frameTime;
      }
  };

  const handleNext = useCallback(() => {
      if (currentVideoIndex !== null && playlist.length > 1) {
          const nextIndex = (currentVideoIndex + 1) % playlist.length;
          loadVideo(nextIndex);
      }
  }, [currentVideoIndex, playlist]);
  
  const handlePrevious = () => {
      if (currentVideoIndex !== null && playlist.length > 1) {
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
            a.download = `lightbird-screenshot-${new Date().toISOString()}.png`;
            a.click();
            toast({ title: "Screenshot Saved" });
        }
    }
  };
  
  const handleSubtitleChange = async (id: string) => {
    setActiveSubtitle(id);
    
    // Use subtitle manager for universal subtitle switching
    if (subtitleManagerRef.current) {
      subtitleManagerRef.current.switchSubtitle(id);
    }
    
    // For embedded subtitles (MKV), also use the player
    if (currentPlayerRef.current) {
      try {
        await currentPlayerRef.current.switchSubtitle(id);
      } catch (error) {
        console.error("Player subtitle switch failed:", error);
      }
    }
  };
  
  const handleAudioTrackChange = async (id: string) => {
    setActiveAudioTrack(id);
    if (currentPlayerRef.current) {
      try {
        setIsLoading(true);
        setLoadingMessage("Switching audio track...");
        await currentPlayerRef.current.switchAudioTrack(id);
        setIsLoading(false);
        setLoadingMessage("");
      } catch (error) {
        console.error("Failed to switch audio track:", error);
        toast({ title: "Failed to switch audio track", variant: "destructive" });
        setIsLoading(false);
        setLoadingMessage("");
      }
    }
  };

  const handleSubtitleUpload = () => {
    subtitleInputRef.current?.click();
  };

  const handleSubtitleRemove = async (id: string) => {
    if (!subtitleManagerRef.current) return;
    
    const success = subtitleManagerRef.current.removeSubtitle(id);
    if (success) {
      // Update state
      const updatedSubtitles = subtitleManagerRef.current.getSubtitles();
      setSubtitles(updatedSubtitles);
      
      // If the removed subtitle was active, turn off subtitles
      if (activeSubtitle === id) {
        setActiveSubtitle('-1');
        subtitleManagerRef.current.switchSubtitle('-1');
      }
      
      toast({
        title: "Subtitle removed",
        description: "The subtitle track has been removed."
      });
    }
  };

  const handleSubtitleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !subtitleManagerRef.current) return;

    const subtitleFiles = Array.from(files).filter(file => {
      const fileName = file.name.toLowerCase();
      return ['.srt', '.vtt', '.ass', '.ssa'].some(ext => fileName.endsWith(ext));
    });

    if (subtitleFiles.length === 0) {
      toast({
        title: "No valid subtitle files",
        description: "Please select .srt, .vtt, .ass, or .ssa files.",
        variant: "destructive"
      });
      return;
    }

    try {
      await subtitleManagerRef.current.addSubtitleFiles(subtitleFiles);
      const updatedSubtitles = subtitleManagerRef.current.getSubtitles();
      setSubtitles(updatedSubtitles);
      
      toast({
        title: "Subtitles added",
        description: `Added ${subtitleFiles.length} subtitle file(s).`
      });
    } catch (error) {
      console.error("Failed to add subtitles:", error);
      toast({
        title: "Failed to add subtitles",
        description: "There was an error adding the subtitle files.",
        variant: "destructive"
      });
    }

    // Reset input
    e.target.value = '';
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
            localStorage.setItem(`lightbirdplayer-${currentVideo.name}`, String(video.currentTime));
        }
    };
    const onLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
    };
    const onEnded = () => {
        if (loop) {
            video.currentTime = 0;
            video.play();
        } else {
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

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (currentPlayerRef.current) {
        currentPlayerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="flex flex-1 w-full h-full">
      <div
        ref={playerContainerRef}
        className="flex-1 flex flex-col items-center justify-center bg-black relative group"
      >
        <video
          ref={videoRef}
          className={cn("w-full h-full object-contain transition-all duration-300", isLoading && "invisible")}
          loop={loop}
          onClick={handlePlayPause}
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />

        {(isLoading || loadingMessage) && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10">
                <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
                {loadingMessage && <p className="mt-4 text-lg max-w-sm text-center">{loadingMessage}</p>}
                {!loadingMessage && isLoading && <p className="mt-4 text-lg">Processing video...</p>}
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
                audioTracks={audioTracks}
                activeAudioTrack={activeAudioTrack}
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
                onSubtitleChange={handleSubtitleChange}
                onAudioTrackChange={handleAudioTrackChange}
                onSubtitleUpload={handleSubtitleUpload}
                onSubtitleRemove={handleSubtitleRemove}
             />
        )}
       
        {/* Hidden subtitle upload input */}
        <input
          type="file"
          ref={subtitleInputRef}
          className="hidden"
          multiple
          accept=".vtt,.srt,.ass,.ssa"
          onChange={handleSubtitleFilesSelected}
        />
       
        {!currentVideo && !isLoading && !loadingMessage && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-2xl font-semibold">LightBird Player</p>
                    <p>Add a local file or stream to begin.</p>
                </div>
            </div>
        )}
      </div>
      <PlaylistPanel
        playlist={playlist}
        currentVideoIndex={currentVideoIndex}
        onSelectVideo={(index) => {
            loadVideo(index);
        }}
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

export default LightBirdPlayer;
