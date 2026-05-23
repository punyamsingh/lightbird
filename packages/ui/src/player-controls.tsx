"use client";
import React, { useMemo, type RefObject } from "react";
import type { Chapter } from "@lightbird/core";
import { Slider } from "./primitives/slider";
import { Button } from "./primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./primitives/tooltip";
import { SeekBar } from "./seek-bar";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward,
  Square, ListVideo, RotateCcw,
} from "lucide-react";
import { cn } from "./utils/cn";

interface PlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  loop: boolean;
  isFullScreen: boolean;
  chapters?: Chapter[];
  currentChapter?: Chapter | null;
  onPlayPause: () => void;
  onStop?: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onLoopToggle: () => void;
  onFullScreenToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlaylist?: () => void;
  playlistOpen?: boolean;
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

const IconButton = ({
  label, onClick, active, children, testId,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
  testId?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-label={label}
        data-testid={testId}
        data-active={active || undefined}
        className={cn("h-8 w-8 text-foreground/90 hover:text-foreground hover:bg-accent/60", active && "text-primary")}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent><p>{label}</p></TooltipContent>
  </Tooltip>
);

export const PlayerControls = React.memo(function PlayerControls({
  isPlaying, progress, duration, volume, isMuted, loop, isFullScreen,
  chapters = [],
  onPlayPause, onStop, onSeek, onVolumeChange, onMuteToggle, onLoopToggle,
  onFullScreenToggle, onNext, onPrevious,
  onTogglePlaylist, playlistOpen = false,
  onSeekHover, seekPreviewThumbnail = null,
  abLoop = { pointA: null, pointB: null, isLooping: false }, onABLoopCycle,
  videoRef,
}: PlayerControlsProps) {
  const formattedProgress = useMemo(() => formatTime(progress), [progress]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  return (
    <TooltipProvider>
      <div
        data-testid="player-controls"
        className="flex flex-col bg-background/95 border-t border-border/50 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
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
        <div className="flex items-center gap-1 px-2 pb-1.5 pt-0.5">
          <IconButton label={isPlaying ? "Pause (Space)" : "Play (Space)"} onClick={onPlayPause} testId="play-pause">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Previous (N)" onClick={onPrevious} testId="previous">
            <SkipBack className="h-4 w-4" />
          </IconButton>
          {onStop && (
            <IconButton label="Stop" onClick={onStop} testId="stop">
              <Square className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Next (P)" onClick={onNext} testId="next">
            <SkipForward className="h-4 w-4" />
          </IconButton>

          <div className="mx-1 h-5 w-px bg-border/60" aria-hidden />

          {onABLoopCycle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onABLoopCycle}
                  aria-label="A-B loop"
                  data-testid="ab-loop-button"
                  data-active={abLoop.isLooping}
                  className={cn("h-8 w-8 font-mono text-[10px] font-bold hover:bg-accent/60", abLoop.isLooping && "text-primary")}
                >
                  <span className={cn(abLoop.pointA !== null && "text-primary")}>A</span>
                  <span className="opacity-50">-</span>
                  <span className={cn(abLoop.pointB !== null && "text-primary")}>B</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {abLoop.pointA === null ? "Set loop start (A)"
                    : abLoop.pointB === null ? "Set loop end (B)"
                    : "Clear A-B loop"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          <IconButton label="Loop" onClick={onLoopToggle} active={loop} testId="loop">
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          {onTogglePlaylist && (
            <IconButton label="Playlist" onClick={onTogglePlaylist} active={playlistOpen} testId="playlist-toggle">
              <ListVideo className="h-4 w-4" />
            </IconButton>
          )}

          <span className="ml-2 font-mono text-[11px] tabular-nums text-foreground/80">
            <span data-testid="time-current">{formattedProgress}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-muted-foreground">{formattedDuration}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <IconButton label="Mute (M)" onClick={onMuteToggle} testId="mute">
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconButton>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={([val]) => onVolumeChange(val)}
              className="w-20"
              trackClassName="h-1"
              thumbClassName="h-3 w-3"
              aria-label="Volume"
            />
            <span className="ml-1 mr-1 font-mono text-[10px] tabular-nums text-muted-foreground w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
            <IconButton label="Fullscreen (F)" onClick={onFullScreenToggle} active={isFullScreen} testId="fullscreen">
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </IconButton>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

export default PlayerControls;
