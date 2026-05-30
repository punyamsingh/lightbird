"use client";
import React, { useRef, useState, type RefObject } from "react";
import type { Chapter } from "@lightbird/core";
import { useSmoothProgress } from "@lightbird/core/react";
import { Slider } from "./primitives/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./primitives/tooltip";
import { cn } from "./utils/cn";

interface SeekBarProps {
  progress: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (value: number) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  chapters?: Chapter[];
  abLoop?: { pointA: number | null; pointB: number | null; isLooping: boolean };
  onSeekHover?: (timeSeconds: number | null) => void;
  seekPreviewThumbnail?: string | null;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "00:00";
  const date = new Date(0);
  date.setSeconds(time);
  const timeString = date.toISOString().substr(11, 8);
  return timeString.startsWith("00:") ? timeString.substr(3) : timeString;
};

export const SeekBar = React.memo(function SeekBar({
  progress,
  duration,
  isPlaying,
  onSeek,
  videoRef,
  chapters = [],
  abLoop = { pointA: null, pointB: null, isLooping: false },
  onSeekHover,
  seekPreviewThumbnail = null,
}: SeekBarProps) {
  // When videoRef is provided we drive the thumb from rAF for buttery motion;
  // otherwise we trust the parent-supplied progress.
  const noopRef = useRef<HTMLVideoElement | null>(null);
  const smooth = useSmoothProgress(videoRef ?? noopRef, {
    isPlaying: !!videoRef && isPlaying,
    fallback: progress,
  });
  const displayProgress = videoRef ? smooth : progress;

  const [seekHover, setSeekHover] = useState<{ ratio: number; time: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const active = isHovering || isScrubbing;

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = ratio * duration;
    setSeekHover({ ratio, time });
    onSeekHover?.(time);
  };

  const handleSeekLeave = () => {
    setSeekHover(null);
    setIsHovering(false);
    onSeekHover?.(null);
  };

  return (
    <div
      className="relative w-full py-2"
      data-testid="seek-bar"
      data-scrubbing={isScrubbing || undefined}
      data-hover={isHovering || undefined}
      onMouseEnter={() => setIsHovering(true)}
      onMouseMove={handleSeekHover}
      onMouseLeave={handleSeekLeave}
    >
      {seekHover && (
        <div
          data-testid="seek-preview"
          className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none flex flex-col items-center z-20"
          style={{ left: `${seekHover.ratio * 100}%` }}
        >
          {seekPreviewThumbnail ? (
            <img
              src={seekPreviewThumbnail}
              alt=""
              className="w-40 h-[90px] rounded border border-white/20 bg-black object-cover shadow-lg"
            />
          ) : (
            <div className="w-40 h-[90px] rounded border border-white/20 bg-black/80 shadow-lg" />
          )}
          <span className="mt-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
            {formatTime(seekHover.time)}
          </span>
        </div>
      )}
      <Slider
        value={[displayProgress]}
        max={duration || 0}
        step={0.05}
        onValueChange={([val]) => onSeek(val)}
        onPointerDown={() => setIsScrubbing(true)}
        onPointerUp={() => setIsScrubbing(false)}
        onLostPointerCapture={() => setIsScrubbing(false)}
        className="w-full"
        trackClassName={cn(active ? "h-3" : "h-2")}
        rangeClassName={cn(active && "shadow-[0_0_8px_hsl(var(--primary)/0.7)]")}
        thumbClassName={cn(
          active && "scale-110",
          isScrubbing && "scale-125"
        )}
      />
      {chapters.length > 0 && duration > 0 && chapters.slice(1).map((chapter) => (
        <Tooltip key={chapter.index}>
          <TooltipTrigger asChild>
            <div
              data-testid="chapter-tick"
              style={{
                position: 'absolute',
                left: `${(chapter.startTime / duration) * 100}%`,
                top: '50%',
                width: '2px',
                height: active ? '14px' : '12px',
                background: 'white',
                opacity: 0.6,
                pointerEvents: 'none',
                transform: 'translate(-1px, -50%)',
                transition: 'height 150ms ease-out',
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{chapter.title} — {formatTime(chapter.startTime)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {duration > 0 && abLoop.pointA !== null && abLoop.pointB !== null && (
        <div
          data-testid="ab-loop-region"
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 bg-primary/30 transition-[height] duration-150",
            active ? "h-3" : "h-2"
          )}
          style={{
            left: `${(abLoop.pointA / duration) * 100}%`,
            width: `${((abLoop.pointB - abLoop.pointA) / duration) * 100}%`,
          }}
        />
      )}
      {duration > 0 && abLoop.pointA !== null && (
        <div
          data-testid="ab-marker-a"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-0.5 -translate-x-1/2 bg-primary"
          style={{ left: `${(abLoop.pointA / duration) * 100}%` }}
        />
      )}
      {duration > 0 && abLoop.pointB !== null && (
        <div
          data-testid="ab-marker-b"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-0.5 -translate-x-1/2 bg-primary"
          style={{ left: `${(abLoop.pointB / duration) * 100}%` }}
        />
      )}
    </div>
  );
});

export default SeekBar;
