
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { PlaylistItem, Subtitle, VideoFilters, AudioTrack } from "@/types";
import { cn } from "@/lib/utils";
import PlayerControls from "@/components/player-controls";
import PlaylistPanel from "@/components/playlist-panel";
import { useToast } from "@/hooks/use-toast";
import { initFFmpeg, probeFile, remuxFile, FfmpegFile } from "@/lib/ffmpeg";
import type { FFmpeg } from "@ffmpeg/ffmpeg";


const NovaPlayer = () => {
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
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const currentFileRef = useRef<FfmpegFile | null>(null);

  const { toast } = useToast();

  const currentVideo = currentVideoIndex !== null ? playlist[currentVideoIndex] : null;

    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                setLoadingMessage("Loading FFmpeg...");
                const ffmpegInstance = await initFFmpeg((log) => {
                     setLoadingMessage(log);
                });
                ffmpegRef.current = ffmpegInstance;
                setLoadingMessage("");
            } catch (error) {
                console.error("Failed to load FFmpeg", error);
                toast({ title: "FFmpeg Failed to Load", description: "The video processor could not be started.", variant: "destructive" });
                setLoadingMessage("Error loading FFmpeg.");
            }
        };
        loadFFmpeg();
    }, [toast]);

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

  const processFile = async (file: File) => {
    if (!ffmpegRef.current) {
      toast({ title: "FFmpeg not loaded yet", description: "Please wait a moment and try again.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setLoadingMessage("Probing file...");
    
    try {
        const ffmpegFile = await probeFile(ffmpegRef.current, file);
        currentFileRef.current = ffmpegFile;
        
        const { audio, subtitles: probeSubs } = ffmpegFile.streams;

        const newAudioTracks: AudioTrack[] = audio.map((stream, i) => ({
          id: String(stream.index),
          name: `Track ${stream.index} (${stream.tags?.language || stream.codec_name})`,
          lang: stream.tags?.language || 'unknown',
        }));
        setAudioTracks(newAudioTracks);
        const firstAudioTrack = newAudioTracks[0]?.id || '0';
        setActiveAudioTrack(firstAudioTrack);

        const newSubtitleTracks: Subtitle[] = probeSubs.map((stream, i) => ({
          id: String(stream.index),
          name: `Track ${stream.index} (${stream.tags?.language || stream.codec_name})`,
          lang: stream.tags?.language || 'unknown',
          type: 'embedded'
        }));
        setSubtitles(newSubtitleTracks);
        setActiveSubtitle('-1'); // Default to off

        setLoadingMessage("Remuxing video...");
        await remuxAndPlay(Number(firstAudioTrack), -1); // Play with first audio, no subs
    } catch(error) {
        console.error(error);
        toast({ title: "Failed to process video", description: "There was an error analyzing the video file.", variant: "destructive" });
        setIsLoading(false);
        setLoadingMessage("");
    }
  }
  
  const remuxAndPlay = async (audioStreamIndex: number, subtitleStreamIndex: number) => {
      if(!ffmpegRef.current || !currentFileRef.current) return;
      
      const audioTrack = currentFileRef.current.streams.audio.find(a => a.index === audioStreamIndex);
      const subtitleTrack = currentFileRef.current.streams.subtitles.find(s => s.index === subtitleStreamIndex);

      // We need the mapping from the original stream index to the output file index (which is 0-based for each type)
      const audioOutputIndex = currentFileRef.current.streams.audio.findIndex(a => a.index === audioStreamIndex);
      const subtitleOutputIndex = currentFileRef.current.streams.subtitles.findIndex(s => s.index === subtitleStreamIndex);

      if (!audioTrack) {
        toast({ title: "Audio track not found", variant: "destructive" });
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage("Remuxing video...");
      
      try {
        const outputUrl = await remuxFile(ffmpegRef.current, audioOutputIndex, subtitleOutputIndex);
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const wasPlaying = !videoRef.current.paused;

            videoRef.current.src = outputUrl;
            videoRef.current.load();
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current!.currentTime = currentTime;
                if (wasPlaying) videoRef.current!.play().catch(console.error);
                setIsLoading(false);
                setLoadingMessage("");
            }, { once: true });
        }
      } catch (error) {
          console.error(error);
          toast({ title: "Failed to remux video", description: "Could not prepare the video for playback.", variant: "destructive" });
          setIsLoading(false);
      }
  }


  const handleFileChange = async (files: FileList) => {
    const videoFiles: File[] = [];
    const videoExtensions = ['.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mp4'];

    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith("video/") || videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (isVideo) videoFiles.push(file);
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
    await processFile(videoFile);
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
            a.download = `nova-screenshot-${new Date().toISOString()}.png`;
            a.click();
            toast({ title: "Screenshot Saved" });
        }
    }
  };
  
  const handleSubtitleChange = (id: string) => {
    const subIndex = Number(id);
    setActiveSubtitle(id);
    if(currentVideo?.type === 'video') {
        remuxAndPlay(Number(activeAudioTrack), subIndex);
    }
  }
  
  const handleAudioTrackChange = (id: string) => {
    const audioIndex = Number(id);
    setActiveAudioTrack(id);
    if(currentVideo?.type === 'video') {
        remuxAndPlay(audioIndex, Number(activeSubtitle));
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
             />
        )}
       
        {!currentVideo && !isLoading && !loadingMessage && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-2xl font-semibold">NOVA Player</p>
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

export default NovaPlayer;
