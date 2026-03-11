"use client";

import React, { useRef, useState } from "react";
import type { PlaylistItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  FilePlus, Link, ListVideo, Tv,
  Pin, PinOff, ChevronLeft, ChevronRight, Maximize2, Minimize2,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type PlaylistSize = "sm" | "md" | "lg";

const SIZE_WIDTHS: Record<PlaylistSize, string> = {
  sm: "w-60",
  md: "w-80",
  lg: "w-96",
};

const NEXT_SIZE: Record<PlaylistSize, PlaylistSize> = {
  sm: "md",
  md: "lg",
  lg: "sm",
};

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  currentVideoIndex: number | null;
  onSelectVideo: (index: number) => void;
  onFilesAdded: (files: FileList) => void;
  onAddStream: (url: string, name?: string) => void;
  isOpen: boolean;
  isPinned: boolean;
  size: PlaylistSize;
  onToggle: () => void;
  onTogglePin: () => void;
  onSizeChange: (size: PlaylistSize) => void;
}

export const PlaylistPanel = React.memo(function PlaylistPanel({
  playlist,
  currentVideoIndex,
  onSelectVideo,
  onFilesAdded,
  onAddStream,
  isOpen,
  isPinned,
  size,
  onToggle,
  onTogglePin,
  onSizeChange,
}: PlaylistPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [streamUrl, setStreamUrl] = useState("");

  const virtualizer = useVirtualizer({
    count: playlist.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const handleStreamUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamUrl) {
      onAddStream(streamUrl);
      setStreamUrl("");
    }
  };

  return (
    <TooltipProvider>
      {!isOpen ? (
        /* ── Collapsed drawer strip ── */
        <div className="flex flex-col items-center w-11 h-full bg-card border-l border-border shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 mt-2 shrink-0"
                onClick={onToggle}
                aria-label="Expand Playlist"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Expand Playlist</p></TooltipContent>
          </Tooltip>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <span
              className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Playlist
            </span>
          </div>

          {playlist.length > 0 && (
            <span className="mb-3 text-[10px] font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
              {playlist.length > 99 ? "99+" : playlist.length}
            </span>
          )}
        </div>
      ) : (
        /* ── Full panel ── */
        <div className={cn("h-full flex flex-col bg-card border-l border-border shrink-0 transition-[width] duration-200", SIZE_WIDTHS[size])}>

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListVideo className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">Playlist</span>
              {playlist.length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0 leading-none">
                  {playlist.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", isPinned && "text-primary bg-primary/10")}
                    onClick={onTogglePin}
                    aria-label={isPinned ? "Unpin Playlist" : "Pin Playlist"}
                  >
                    {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{isPinned ? "Unpin (allow auto-hide on play)" : "Pin (keep open while playing)"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onSizeChange(NEXT_SIZE[size])}
                    aria-label="Resize Playlist"
                  >
                    {size === "lg" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{size === "lg" ? "Make smaller" : "Make larger"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggle}
                    aria-label="Collapse Playlist"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Collapse</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Add files & stream */}
          <div className="p-3 space-y-2 border-b border-border shrink-0">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full h-8 text-xs">
              <FilePlus className="mr-2 h-3.5 w-3.5" /> Add Local Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.vtt,.srt"
              onChange={(e) => e.target.files && onFilesAdded(e.target.files)}
            />
            <form onSubmit={handleStreamUrlSubmit} className="flex gap-1.5">
              <Input
                type="url"
                placeholder="Enter stream URL"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <Button type="submit" size="icon" variant="secondary" className="h-8 w-8 shrink-0">
                <Link className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>

          {/* Playlist items — virtualised */}
          <div ref={scrollContainerRef} className="flex-1 overflow-auto p-2">
            {playlist.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 px-2">
                <p>Your playlist is empty.</p>
                <p>Add files or a stream URL to get started.</p>
              </div>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vItem) => {
                  const item = playlist[vItem.index];
                  const index = vItem.index;
                  return (
                    <div
                      key={vItem.key}
                      ref={virtualizer.measureElement}
                      data-index={vItem.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${vItem.start}px)`,
                      }}
                    >
                      <button
                        onClick={() => onSelectVideo(index)}
                        className={cn(
                          "w-full text-left p-2 rounded-md text-xs flex items-center gap-2",
                          "hover:bg-muted transition-colors",
                          index === currentVideoIndex ? "bg-primary/20 text-primary-foreground" : ""
                        )}
                      >
                        {item.type === "video"
                          ? <ListVideo className="w-3.5 h-3.5 shrink-0" />
                          : <Tv className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
});

export default PlaylistPanel;
