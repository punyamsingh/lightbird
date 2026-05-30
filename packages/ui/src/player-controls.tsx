"use client";
import React, { useMemo, useState, type RefObject } from "react";
import type { Subtitle, VideoFilters, AudioTrack, Chapter } from "@lightbird/core";
import { Slider } from "./primitives/slider";
import { Button } from "./primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./primitives/tooltip";
import { Label } from "./primitives/label";
import { SeekBar } from "./seek-bar";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward,
  Settings2, Subtitles, Camera, AudioLines, Plus, X,
  Info, Keyboard, List, PictureInPicture2, Loader2
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./primitives/radio-group";
import { cn } from "./utils/cn";

interface PlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  loop: boolean;
  isFullScreen: boolean;
  filters: VideoFilters;
  zoom: number;
  subtitles: Subtitle[];
  activeSubtitle: string;
  audioTracks: AudioTrack[];
  activeAudioTrack: string;
  chapters?: Chapter[];
  currentChapter?: Chapter | null;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onLoopToggle: () => void;
  onFullScreenToggle: () => void;
  onFrameStep: (direction: 'forward' | 'backward') => void;
  onScreenshot: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onFiltersChange: (filters: VideoFilters) => void;
  onZoomChange: (zoom: number) => void;
  onSubtitleChange: (id: string) => void;
  onAudioTrackChange: (id: string) => void;
  tracksLoading?: boolean;
  onSubtitleUpload?: () => void;
  onSubtitleRemove?: (id: string) => void;
  onShowInfo?: () => void;
  onOpenShortcuts?: () => void;
  onGoToChapter?: (index: number) => void;
  onTogglePiP?: () => void;
  isPiP?: boolean;
  pipSupported?: boolean;
  onSeekHover?: (timeSeconds: number | null) => void;
  seekPreviewThumbnail?: string | null;
  abLoop?: { pointA: number | null; pointB: number | null; isLooping: boolean };
  onABLoopCycle?: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "00:00";
  const date = new Date(0);
  date.setSeconds(time);
  const timeString = date.toISOString().substr(11, 8);
  return timeString.startsWith("00:") ? timeString.substr(3) : timeString;
};

export const PlayerControls = React.memo(function PlayerControls({
  isPlaying, progress, duration, volume, isMuted, playbackRate, loop, isFullScreen,
  filters, zoom, subtitles, activeSubtitle, audioTracks, activeAudioTrack,
  chapters = [], currentChapter = null,
  onPlayPause, onSeek, onVolumeChange, onMuteToggle, onPlaybackRateChange, onLoopToggle,
  onFullScreenToggle, onFrameStep, onScreenshot, onNext, onPrevious, onFiltersChange,
  onZoomChange, onSubtitleChange, onAudioTrackChange, tracksLoading = false,
  onSubtitleUpload, onSubtitleRemove,
  onShowInfo, onOpenShortcuts, onGoToChapter, onTogglePiP, isPiP = false, pipSupported = false,
  onSeekHover, seekPreviewThumbnail = null,
  abLoop = { pointA: null, pointB: null, isLooping: false }, onABLoopCycle,
  videoRef,
}: PlayerControlsProps) {
  const formattedProgress = useMemo(() => formatTime(progress), [progress]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);
  const [chaptersMenuOpen, setChaptersMenuOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out flex flex-col gap-1.5">
        <SeekBar
          progress={progress}
          duration={duration}
          isPlaying={isPlaying}
          onSeek={onSeek}
          videoRef={videoRef}
          chapters={chapters}
          abLoop={abLoop}
          onSeekHover={onSeekHover}
          seekPreviewThumbnail={seekPreviewThumbnail}
        />

        {currentChapter && (
          <span className="text-xs text-muted-foreground -mt-0.5">{currentChapter.title}</span>
        )}

        <div className="flex items-center justify-between text-white">
          {/* ── Left: transport + volume + time ─────────────────── */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onPrevious}><SkipBack /></Button></TooltipTrigger>
              <TooltipContent><p>Previous (N)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onPlayPause}>{isPlaying ? <Pause /> : <Play />}</Button></TooltipTrigger>
              <TooltipContent><p>{isPlaying ? 'Pause' : 'Play'} (Space)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onNext}><SkipForward /></Button></TooltipTrigger>
              <TooltipContent><p>Next (P)</p></TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1 ml-1 group/vol">
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onMuteToggle}>{isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}</Button></TooltipTrigger>
                <TooltipContent><p>Mute (M)</p></TooltipContent>
              </Tooltip>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.05}
                onValueChange={([val]) => onVolumeChange(val)}
                className="w-0 group-hover/vol:w-24 transition-[width] duration-200 ease-out overflow-hidden"
              />
            </div>
            <span className="font-mono text-xs tabular-nums ml-2 text-white/90">
              {formattedProgress} <span className="text-white/50">/ {formattedDuration}</span>
            </span>
          </div>

          {/* ── Right: audio + subs + speed + gear + chapters + fullscreen ─── */}
          <div className="flex items-center gap-1">
            {audioTracks.length > 0 && (
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative" aria-label="Audio track">
                        <AudioLines />
                        {tracksLoading && <Loader2 className="absolute top-0 right-0 h-2.5 w-2.5 animate-spin text-primary" />}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Audio track</p></TooltipContent>
                </Tooltip>
                <PopoverContent className="w-56">
                  <div className="max-h-48 overflow-y-auto overscroll-contain pr-1">
                    <RadioGroup value={activeAudioTrack} onValueChange={onAudioTrackChange}>
                      {audioTracks.map(track => (
                        <div key={track.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={track.id} id={`audio-${track.id}`} />
                          <Label htmlFor={`audio-${track.id}`}>{track.name}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" aria-label="Subtitles">
                      <Subtitles />
                      {tracksLoading
                        ? <Loader2 className="absolute top-0 right-0 h-2.5 w-2.5 animate-spin text-primary" />
                        : activeSubtitle !== '-1' && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Subtitles</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Subtitles</Label>
                    {onSubtitleUpload && (
                      <Button variant="outline" size="sm" onClick={onSubtitleUpload} className="h-7 px-2">
                        <Plus className="h-3 w-3 mr-1" />Add
                      </Button>
                    )}
                  </div>
                  {subtitles.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto overscroll-contain pr-1">
                      <RadioGroup value={activeSubtitle} onValueChange={onSubtitleChange}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="-1" id="sub-off" />
                          <Label htmlFor="sub-off">Off</Label>
                        </div>
                        {subtitles.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <RadioGroupItem value={sub.id} id={`sub-${sub.id}`} />
                              <Label htmlFor={`sub-${sub.id}`} className="truncate">{sub.name}</Label>
                            </div>
                            {sub.type === 'external' && onSubtitleRemove && (
                              <Button variant="ghost" size="sm" onClick={() => onSubtitleRemove(sub.id)} className="h-6 w-6 p-0">
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No subtitles available</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="font-mono w-12 h-9 px-2 text-xs">{playbackRate}x</Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Playback speed</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-40">
                <RadioGroup value={String(playbackRate)} onValueChange={(val) => onPlaybackRateChange(Number(val))}>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].map(rate => (
                    <div key={rate} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(rate)} id={`rate-${rate}`} />
                      <Label htmlFor={`rate-${rate}`}>{rate}x</Label>
                    </div>
                  ))}
                </RadioGroup>
              </PopoverContent>
            </Popover>

            {/* Settings gear — consolidates everything secondary */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Settings"><Settings2 /></Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Settings</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-72 p-2 space-y-1" align="end">
                {/* Secondary action rows */}
                <div className="space-y-0.5">
                  {pipSupported && (
                    <button
                      onClick={onTogglePiP}
                      aria-label={isPiP ? "Exit picture-in-picture" : "Enter picture-in-picture"}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left",
                        isPiP && "text-primary",
                      )}
                    >
                      <PictureInPicture2 className="h-4 w-4" />
                      Picture-in-Picture
                    </button>
                  )}
                  <button onClick={onScreenshot} className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left">
                    <Camera className="h-4 w-4" />
                    Screenshot
                  </button>
                  {onShowInfo && (
                    <button onClick={onShowInfo} className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left">
                      <Info className="h-4 w-4" />
                      Video information
                    </button>
                  )}
                  {onOpenShortcuts && (
                    <button onClick={onOpenShortcuts} className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left">
                      <Keyboard className="h-4 w-4" />
                      Keyboard shortcuts
                    </button>
                  )}
                </div>

                {/* Filters & zoom */}
                <div className="border-t border-border/40 pt-2 space-y-2 px-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Display</Label>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Brightness: {filters.brightness}%</Label>
                    <Slider value={[filters.brightness]} max={200} onValueChange={([val]) => onFiltersChange({...filters, brightness: val})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Contrast: {filters.contrast}%</Label>
                    <Slider value={[filters.contrast]} max={200} onValueChange={([val]) => onFiltersChange({...filters, contrast: val})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Saturation: {filters.saturate}%</Label>
                    <Slider value={[filters.saturate]} max={200} onValueChange={([val]) => onFiltersChange({...filters, saturate: val})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hue: {filters.hue}°</Label>
                    <Slider value={[filters.hue]} max={360} onValueChange={([val]) => onFiltersChange({...filters, hue: val})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</Label>
                    <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([val]) => onZoomChange(val)} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Chapters (conditional, kept visible since users want quick jumps) */}
            {chapters.length > 0 && (
              <Popover open={chaptersMenuOpen} onOpenChange={setChaptersMenuOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Chapters">
                        <List className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Chapters</p></TooltipContent>
                </Tooltip>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="flex flex-col max-h-64 overflow-y-auto">
                    {chapters.map((chapter) => (
                      <button
                        key={chapter.index}
                        className={cn(
                          "flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors text-left",
                          currentChapter?.index === chapter.index && "bg-accent font-medium",
                        )}
                        onClick={() => {
                          onGoToChapter?.(chapter.index);
                          setChaptersMenuOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{chapter.title}</span>
                        <span className="ml-4 font-mono text-xs text-muted-foreground shrink-0">
                          {formatTime(chapter.startTime)}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onFullScreenToggle}>{isFullScreen ? <Minimize /> : <Maximize />}</Button></TooltipTrigger>
              <TooltipContent><p>Fullscreen (F)</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

export default PlayerControls;
