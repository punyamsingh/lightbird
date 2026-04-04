"use client";
import React, { useRef, useState } from "react";
import type { PlaylistItem } from "lightbird";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "./primitives/scroll-area";
import { Button } from "./primitives/button";
import { Input } from "./primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./primitives/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./primitives/tooltip";
import { cn } from "./utils/cn";
import {
  FilePlus,
  FolderOpen,
  Link,
  ListVideo,
  Tv,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  GripVertical,
  Download,
  Upload,
} from "lucide-react";
import { exportPlaylist, parseM3U8 } from "lightbird";

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

type SortKey = "name-asc" | "name-desc" | "duration-asc" | "duration-desc";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const VIDEO_EXTENSIONS_RE = /\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v)$/i;

interface SortableItemProps {
  item: PlaylistItem;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}

function SortablePlaylistItem({ item, index, isActive, onSelect, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const duration = formatTime(item.duration ?? 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 p-1.5 rounded-md text-xs group",
        "hover:bg-muted transition-colors",
        isActive ? "bg-primary/20 text-primary-foreground" : ""
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Item select button */}
      <button
        onClick={() => onSelect(index)}
        className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
        aria-label={`Play ${item.name}`}
      >
        {item.type === "video"
          ? <ListVideo className="w-3.5 h-3.5 shrink-0" />
          : <Tv className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">{item.name}</span>
        {duration && (
          <span className="text-xs text-muted-foreground ml-auto shrink-0 pl-1">
            {duration}
          </span>
        )}
      </button>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        aria-label="Remove from playlist"
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  currentVideoIndex: number | null;
  onSelectVideo: (index: number) => void;
  onFilesAdded: (files: FileList) => void;
  onFolderFilesAdded: (files: File[]) => void;
  onAddStream: (url: string, name?: string) => void;
  onRemoveItem: (index: number) => void;
  onReorder: (newPlaylist: PlaylistItem[]) => void;
  onImportM3U: (items: Omit<PlaylistItem, "id">[]) => void;
  isOpen: boolean;
  isPinned: boolean;
  size: PlaylistSize;
  onToggle: () => void;
  onTogglePin: () => void;
  onSizeChange: (size: PlaylistSize) => void;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  playlist,
  currentVideoIndex,
  onSelectVideo,
  onFilesAdded,
  onFolderFilesAdded,
  onAddStream,
  onRemoveItem,
  onReorder,
  onImportM3U,
  isOpen,
  isPinned,
  size,
  onToggle,
  onTogglePin,
  onSizeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const m3uInputRef = useRef<HTMLInputElement>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | "">("");

  const handleStreamUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamUrl) {
      onAddStream(streamUrl);
      setStreamUrl("");
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
      .filter((f) => VIDEO_EXTENSIONS_RE.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (files.length > 0) onFolderFilesAdded(files);
    e.target.value = "";
  };

  const handleM3USelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const items = parseM3U8(text);
    if (items.length > 0) onImportM3U(items);
    e.target.value = "";
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playlist.findIndex((item) => item.id === active.id);
    const newIndex = playlist.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(playlist, oldIndex, newIndex));
    }
  };

  const handleSort = (value: string) => {
    setSortKey(value as SortKey);
    const sorted = [...playlist].sort((a, b) => {
      switch (value as SortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        case "name-desc":
          return b.name.localeCompare(a.name, undefined, { numeric: true });
        case "duration-asc":
          return (a.duration ?? 0) - (b.duration ?? 0);
        case "duration-desc":
          return (b.duration ?? 0) - (a.duration ?? 0);
        default:
          return 0;
      }
    });
    onReorder(sorted);
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
              {playlist.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => exportPlaylist(playlist)}
                      aria-label="Export Playlist"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Export as M3U8</p></TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => m3uInputRef.current?.click()}
                    aria-label="Import Playlist"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Import M3U/M3U8</p></TooltipContent>
              </Tooltip>

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

          {/* Add files, folder & stream */}
          <div className="p-3 space-y-2 border-b border-border shrink-0">
            <div className="flex gap-1.5">
              <Button onClick={() => fileInputRef.current?.click()} className="flex-1 h-8 text-xs">
                <FilePlus className="mr-1.5 h-3.5 w-3.5" /> Add Files
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => folderInputRef.current?.click()}
                    aria-label="Open Folder"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Open Folder</p></TooltipContent>
              </Tooltip>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.vtt,.srt"
              onChange={(e) => e.target.files && onFilesAdded(e.target.files)}
            />
            <input
              type="file"
              ref={folderInputRef}
              className="hidden"
              multiple
              accept="video/*"
              // @ts-expect-error — webkitdirectory is not in TS types
              webkitdirectory=""
              onChange={handleFolderSelect}
            />
            <input
              type="file"
              ref={m3uInputRef}
              className="hidden"
              accept=".m3u,.m3u8"
              onChange={handleM3USelect}
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

            {playlist.length > 1 && (
              <Select value={sortKey} onValueChange={handleSort}>
                <SelectTrigger className="h-7 text-xs" aria-label="Sort playlist">
                  <SelectValue placeholder="Sort by…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A–Z</SelectItem>
                  <SelectItem value="name-desc">Name Z–A</SelectItem>
                  <SelectItem value="duration-asc">Shortest first</SelectItem>
                  <SelectItem value="duration-desc">Longest first</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Playlist items */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {playlist.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-10 px-2">
                  <p>Your playlist is empty.</p>
                  <p>Add files or a stream URL to get started.</p>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={playlist.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {playlist.map((item, index) => (
                      <SortablePlaylistItem
                        key={item.id}
                        item={item}
                        index={index}
                        isActive={index === currentVideoIndex}
                        onSelect={onSelectVideo}
                        onRemove={onRemoveItem}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </TooltipProvider>
  );
};

export default PlaylistPanel;
