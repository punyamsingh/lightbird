
"use client";
import React, { useMemo, useState } from "react";
import type { Subtitle, VideoFilters, AudioTrack, Chapter } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward,
  FastForward, Rewind, RotateCcw, Settings2, Subtitles, Camera, AudioLines, Plus, X,
  Info, Keyboard, List, PictureInPicture2
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { cn } from "@/lib/utils";

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
  onSubtitleUpload?: () => void;
  onSubtitleRemove?: (id: string) => void;
  onShowInfo?: () => void;
  onOpenShortcuts?: () => void;
  onGoToChapter?: (index: number) => void;
  onTogglePiP?: () => void;
  isPiP?: boolean;
  pipSupported?: boolean;
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
  onZoomChange, onSubtitleChange, onAudioTrackChange, onSubtitleUpload, onSubtitleRemove,
  onShowInfo, onOpenShortcuts, onGoToChapter, onTogglePiP, isPiP = false, pipSupported = false,
}: PlayerControlsProps) {
  const formattedProgress = useMemo(() => formatTime(progress), [progress]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);
  const [chaptersMenuOpen, setChaptersMenuOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
        {/* Seek bar with chapter tick marks */}
        <div className="relative w-full">
          <Slider
            value={[progress]}
            max={duration}
            step={1}
            onValueChange={([val]) => onSeek(val)}
            className="w-full h-2"
          />
          {chapters.length > 0 && duration > 0 && chapters.slice(1).map((chapter) => (
            <Tooltip key={chapter.index}>
              <TooltipTrigger asChild>
                <div
                  data-testid="chapter-tick"
                  style={{
                    position: 'absolute',
                    left: `${(chapter.startTime / duration) * 100}%`,
                    top: 0,
                    width: '2px',
                    height: '100%',
                    background: 'white',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    transform: 'translateX(-1px)',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{chapter.title} — {formatTime(chapter.startTime)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Current chapter name */}
        {currentChapter && (
          <span className="text-xs text-muted-foreground">{currentChapter.title}</span>
        )}

        {/* Main Controls */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onMuteToggle}>{isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}</Button></TooltipTrigger>
                <TooltipContent><p>Mute (M)</p></TooltipContent>
              </Tooltip>
              <Slider value={[isMuted ? 0 : volume]} max={1} step={0.05} onValueChange={([val]) => onVolumeChange(val)} className="w-24" />
            </div>
            <span className="font-mono text-sm">{formattedProgress} / {formattedDuration}</span>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onFrameStep('backward')}><Rewind size={18} /></Button></TooltipTrigger>
              <TooltipContent><p>Frame Backward</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onFrameStep('forward')}><FastForward size={18} /></Button></TooltipTrigger>
              <TooltipContent><p>Frame Forward</p></TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                  <Button variant="ghost" className="font-mono w-16">{playbackRate}x</Button>
              </PopoverTrigger>
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
            {audioTracks.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <AudioLines />
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
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
              <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                      <Subtitles />
                      {activeSubtitle !== '-1' && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Subtitles</Label>
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={onSubtitleUpload}
                              className="h-7 px-2"
                          >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                          </Button>
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onSubtitleRemove(sub.id)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </RadioGroup>
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                              No subtitles available
                          </p>
                      )}
                  </div>
              </PopoverContent>
            </Popover>
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
                <PopoverContent className="w-72 p-0">
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
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon"><Settings2 /></Button></PopoverTrigger>
              <PopoverContent className="w-64 space-y-4">
                  <div className="space-y-2">
                      <Label>Brightness: {filters.brightness}%</Label>
                      <Slider value={[filters.brightness]} max={200} onValueChange={([val]) => onFiltersChange({...filters, brightness: val})} />
                  </div>
                  <div className="space-y-2">
                      <Label>Contrast: {filters.contrast}%</Label>
                      <Slider value={[filters.contrast]} max={200} onValueChange={([val]) => onFiltersChange({...filters, contrast: val})} />
                  </div>
                  <div className="space-y-2">
                      <Label>Saturation: {filters.saturate}%</Label>
                      <Slider value={[filters.saturate]} max={200} onValueChange={([val]) => onFiltersChange({...filters, saturate: val})} />
                  </div>
                  <div className="space-y-2">
                      <Label>Hue: {filters.hue}°</Label>
                      <Slider value={[filters.hue]} max={360} onValueChange={([val]) => onFiltersChange({...filters, hue: val})} />
                  </div>
                  <div className="space-y-2">
                      <Label>Zoom: {Math.round(zoom * 100)}%</Label>
                      <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([val]) => onZoomChange(val)} />
                  </div>
              </PopoverContent>
            </Popover>
            {onShowInfo && (
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onShowInfo}><Info className="h-4 w-4" /></Button></TooltipTrigger>
                <TooltipContent><p>Video Information</p></TooltipContent>
              </Tooltip>
            )}
            {onOpenShortcuts && (
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onOpenShortcuts}><Keyboard className="h-4 w-4" /></Button></TooltipTrigger>
                <TooltipContent><p>Keyboard Shortcuts</p></TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onScreenshot}><Camera /></Button></TooltipTrigger>
              <TooltipContent><p>Screenshot</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onLoopToggle} data-active={loop} className="data-[active=true]:text-primary"><RotateCcw /></Button></TooltipTrigger>
              <TooltipContent><p>Loop</p></TooltipContent>
            </Tooltip>
            {pipSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onTogglePiP}
                    aria-label={isPiP ? "Exit picture-in-picture" : "Enter picture-in-picture"}
                    className={isPiP ? "text-primary" : ""}
                  >
                    <PictureInPicture2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isPiP ? "Exit picture-in-picture" : "Enter picture-in-picture"}</p></TooltipContent>
              </Tooltip>
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
