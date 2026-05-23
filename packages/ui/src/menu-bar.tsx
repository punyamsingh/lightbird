"use client";
import React from "react";
import type { Subtitle, AudioTrack, Chapter, VideoFilters } from "@lightbird/core";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/popover";
import { Button } from "./primitives/button";
import { Slider } from "./primitives/slider";
import { Label } from "./primitives/label";
import { Check, Circle } from "lucide-react";
import { cn } from "./utils/cn";

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3];

interface MenuBarProps {
  isPlaying: boolean;
  isFullScreen: boolean;
  isMuted: boolean;
  loop: boolean;
  playbackRate: number;
  filters: VideoFilters;
  zoom: number;
  subtitles: Subtitle[];
  activeSubtitle: string;
  audioTracks: AudioTrack[];
  activeAudioTrack: string;
  chapters?: Chapter[];
  currentChapter?: Chapter | null;
  isPiP?: boolean;
  pipSupported?: boolean;
  playlistOpen?: boolean;
  abLoop?: { pointA: number | null; pointB: number | null; isLooping: boolean };

  onPlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeekRelative: (deltaSeconds: number) => void;
  onFrameStep: (direction: "forward" | "backward") => void;
  onPlaybackRateChange: (rate: number) => void;
  onLoopToggle: () => void;
  onABLoopCycle?: () => void;
  onGoToChapter?: (index: number) => void;
  onMuteToggle: () => void;
  onVolumeStep: (delta: number) => void;
  onAudioTrackChange: (id: string) => void;
  onFullScreenToggle: () => void;
  onTogglePiP?: () => void;
  onScreenshot: () => void;
  onFiltersChange: (filters: VideoFilters) => void;
  onZoomChange: (zoom: number) => void;
  onSubtitleChange: (id: string) => void;
  onSubtitleUpload?: () => void;
  onSubtitleRemove?: (id: string) => void;
  onShowInfo?: () => void;
  onOpenShortcuts?: () => void;
  onOpenFile?: () => void;
  onTogglePlaylist?: () => void;
}

const MenuShortcut = ({ children }: { children: React.ReactNode }) => (
  <span className="ml-auto pl-6 font-mono text-[10px] text-muted-foreground">
    {children}
  </span>
);

interface MenuItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  indent?: boolean;
}

const MenuItem = ({ children, onSelect, shortcut, checked, disabled, indent }: MenuItemProps) => (
  <button
    role="menuitem"
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      "flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-accent focus:bg-accent focus:outline-none disabled:opacity-40 disabled:hover:bg-transparent",
      indent && "pl-7",
    )}
  >
    {checked !== undefined && (
      <span className="mr-2 inline-flex h-3 w-3 items-center justify-center">
        {checked && <Check className="h-3 w-3" />}
      </span>
    )}
    <span className="truncate">{children}</span>
    {shortcut && <MenuShortcut>{shortcut}</MenuShortcut>}
  </button>
);

const MenuSeparator = () => (
  <div role="separator" className="my-1 h-px bg-border" />
);

const MenuLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </div>
);

interface TopMenuProps {
  label: string;
  children: React.ReactNode;
}

const TopMenu = ({ label, children }: TopMenuProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        role="menuitem"
        aria-haspopup="menu"
        data-testid={`menu-${label.toLowerCase()}`}
        className="rounded px-2 py-1 text-xs text-foreground/90 hover:bg-accent focus:bg-accent focus:outline-none data-[state=open]:bg-accent"
      >
        <span className="underline-offset-2">{label[0]}</span>
        {label.slice(1)}
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      sideOffset={2}
      role="menu"
      className="min-w-[15rem] p-1"
    >
      {children}
    </PopoverContent>
  </Popover>
);

export const MenuBar = React.memo(function MenuBar({
  isPlaying, isFullScreen, isMuted, loop, playbackRate,
  filters, zoom, subtitles, activeSubtitle, audioTracks, activeAudioTrack,
  chapters = [], isPiP = false, pipSupported = false, playlistOpen = false,
  abLoop = { pointA: null, pointB: null, isLooping: false },
  onPlayPause, onStop, onNext, onPrevious, onSeekRelative, onFrameStep,
  onPlaybackRateChange, onLoopToggle, onABLoopCycle, onGoToChapter,
  onMuteToggle, onVolumeStep, onAudioTrackChange, onFullScreenToggle,
  onTogglePiP, onScreenshot, onFiltersChange, onZoomChange,
  onSubtitleChange, onSubtitleUpload, onShowInfo, onOpenShortcuts,
  onOpenFile, onTogglePlaylist,
}: MenuBarProps) {
  const abLabel =
    abLoop.pointA === null ? "Set A-B Loop Start" :
    abLoop.pointB === null ? "Set A-B Loop End" :
    "Clear A-B Loop";

  return (
    <div
      role="menubar"
      data-testid="menu-bar"
      className="flex items-center gap-0.5 border-b border-border/50 bg-background/95 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <TopMenu label="Media">
        {onOpenFile && (
          <>
            <MenuItem onSelect={onOpenFile} shortcut="Ctrl+O">Open File…</MenuItem>
            <MenuSeparator />
          </>
        )}
        {onTogglePlaylist && (
          <MenuItem onSelect={onTogglePlaylist} checked={playlistOpen}>
            Playlist
          </MenuItem>
        )}
      </TopMenu>

      <TopMenu label="Playback">
        <MenuItem onSelect={onPlayPause} shortcut="Space">
          {isPlaying ? "Pause" : "Play"}
        </MenuItem>
        <MenuItem onSelect={onStop}>Stop</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onPrevious} shortcut="N">Previous</MenuItem>
        <MenuItem onSelect={onNext} shortcut="P">Next</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => onSeekRelative(10)} shortcut="→">Jump Forward 10s</MenuItem>
        <MenuItem onSelect={() => onSeekRelative(-10)} shortcut="←">Jump Backward 10s</MenuItem>
        <MenuItem onSelect={() => onFrameStep("forward")}>Frame Forward</MenuItem>
        <MenuItem onSelect={() => onFrameStep("backward")}>Frame Backward</MenuItem>
        <MenuSeparator />
        <MenuLabel>Speed</MenuLabel>
        {PLAYBACK_RATES.map((rate) => (
          <MenuItem
            key={rate}
            checked={playbackRate === rate}
            onSelect={() => onPlaybackRateChange(rate)}
          >
            {rate}x
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={onLoopToggle} checked={loop} shortcut="L">Loop</MenuItem>
        {onABLoopCycle && (
          <MenuItem onSelect={onABLoopCycle} checked={abLoop.isLooping}>
            {abLabel}
          </MenuItem>
        )}
        {chapters.length > 0 && onGoToChapter && (
          <>
            <MenuSeparator />
            <MenuLabel>Chapters</MenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {chapters.map((ch) => (
                <MenuItem
                  key={ch.index}
                  onSelect={() => onGoToChapter(ch.index)}
                  indent
                >
                  {ch.title}
                </MenuItem>
              ))}
            </div>
          </>
        )}
      </TopMenu>

      <TopMenu label="Audio">
        <MenuItem onSelect={onMuteToggle} checked={isMuted} shortcut="M">Mute</MenuItem>
        <MenuItem onSelect={() => onVolumeStep(0.05)} shortcut="↑">Volume Up</MenuItem>
        <MenuItem onSelect={() => onVolumeStep(-0.05)} shortcut="↓">Volume Down</MenuItem>
        {audioTracks.length > 0 && (
          <>
            <MenuSeparator />
            <MenuLabel>Audio Track</MenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {audioTracks.map((t) => (
                <MenuItem
                  key={t.id}
                  onSelect={() => onAudioTrackChange(t.id)}
                  checked={activeAudioTrack === t.id}
                >
                  {t.name}
                </MenuItem>
              ))}
            </div>
          </>
        )}
      </TopMenu>

      <TopMenu label="Video">
        <MenuItem onSelect={onFullScreenToggle} checked={isFullScreen} shortcut="F">
          Fullscreen
        </MenuItem>
        {pipSupported && onTogglePiP && (
          <MenuItem onSelect={onTogglePiP} checked={isPiP}>Picture-in-Picture</MenuItem>
        )}
        <MenuItem onSelect={onScreenshot}>Take Screenshot</MenuItem>
        <MenuSeparator />
        <MenuLabel>Zoom</MenuLabel>
        {ZOOM_LEVELS.map((z) => (
          <MenuItem
            key={z}
            onSelect={() => onZoomChange(z)}
            checked={Math.abs(zoom - z) < 0.01}
          >
            {Math.round(z * 100)}%
          </MenuItem>
        ))}
        <MenuSeparator />
        <div role="menuitem" className="px-2 py-1.5 space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Brightness: {filters.brightness}%</Label>
            <Slider
              value={[filters.brightness]} max={200}
              onValueChange={([v]) => onFiltersChange({ ...filters, brightness: v })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Contrast: {filters.contrast}%</Label>
            <Slider
              value={[filters.contrast]} max={200}
              onValueChange={([v]) => onFiltersChange({ ...filters, contrast: v })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Saturation: {filters.saturate}%</Label>
            <Slider
              value={[filters.saturate]} max={200}
              onValueChange={([v]) => onFiltersChange({ ...filters, saturate: v })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Hue: {filters.hue}°</Label>
            <Slider
              value={[filters.hue]} max={360}
              onValueChange={([v]) => onFiltersChange({ ...filters, hue: v })}
            />
          </div>
        </div>
      </TopMenu>

      <TopMenu label="Subtitle">
        {onSubtitleUpload && (
          <>
            <MenuItem onSelect={onSubtitleUpload}>Add Subtitle File…</MenuItem>
            <MenuSeparator />
          </>
        )}
        <MenuLabel>Track</MenuLabel>
        <MenuItem
          onSelect={() => onSubtitleChange("-1")}
          checked={activeSubtitle === "-1"}
        >
          Off
        </MenuItem>
        {subtitles.length === 0 ? (
          <div className="px-2 py-1 text-[10px] text-muted-foreground">No subtitles available</div>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {subtitles.map((s) => (
              <MenuItem
                key={s.id}
                onSelect={() => onSubtitleChange(s.id)}
                checked={activeSubtitle === s.id}
              >
                {s.name}
              </MenuItem>
            ))}
          </div>
        )}
      </TopMenu>

      <TopMenu label="Tools">
        {onShowInfo && <MenuItem onSelect={onShowInfo}>Video Information…</MenuItem>}
        {onOpenShortcuts && (
          <MenuItem onSelect={onOpenShortcuts}>Keyboard Shortcuts…</MenuItem>
        )}
      </TopMenu>

      <TopMenu label="View">
        {onTogglePlaylist && (
          <MenuItem onSelect={onTogglePlaylist} checked={playlistOpen}>
            Playlist
          </MenuItem>
        )}
        <MenuItem onSelect={onFullScreenToggle} checked={isFullScreen} shortcut="F">
          Fullscreen
        </MenuItem>
      </TopMenu>

      <TopMenu label="Help">
        <MenuItem
          onSelect={() => window.open("https://github.com/punyamsingh/lightbird", "_blank", "noopener")}
        >
          GitHub Repository
        </MenuItem>
        <MenuItem
          onSelect={() => window.open("https://lightbird.vercel.app/docs", "_blank", "noopener")}
        >
          Documentation
        </MenuItem>
      </TopMenu>

      <div className="ml-auto flex items-center gap-1 pl-2 text-[10px] text-muted-foreground">
        <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
        LightBird
      </div>
    </div>
  );
});

export default MenuBar;
