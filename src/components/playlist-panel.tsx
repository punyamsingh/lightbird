"use client";

import React, { useRef, useState } from "react";
import type { PlaylistItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FilePlus, Link, ListVideo, Tv } from "lucide-react";

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  currentVideoIndex: number | null;
  onSelectVideo: (index: number) => void;
  onFilesAdded: (files: FileList) => void;
  onAddStream: (url: string, name?: string) => void;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  playlist,
  currentVideoIndex,
  onSelectVideo,
  onFilesAdded,
  onAddStream,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamUrl, setStreamUrl] = useState("");

  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleStreamUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamUrl) {
      onAddStream(streamUrl);
      setStreamUrl("");
    }
  };

  return (
    <Card className="w-80 h-full flex flex-col border-l border-border rounded-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListVideo className="text-primary" /> Playlist
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="p-4 space-y-2 border-b">
            <Button onClick={handleAddFilesClick} className="w-full">
                <FilePlus className="mr-2 h-4 w-4" /> Add Local Files
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="video/*,.vtt,.srt"
                onChange={(e) => e.target.files && onFilesAdded(e.target.files)}
            />
            <form onSubmit={handleStreamUrlSubmit} className="flex gap-2">
                <Input
                    type="url"
                    placeholder="Enter stream URL"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                />
                <Button type="submit" size="icon" variant="secondary"><Link className="h-4 w-4" /></Button>
            </form>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {playlist.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10">
                    <p>Your playlist is empty.</p>
                    <p>Add files or a stream URL to get started.</p>
                </div>
            ) : (
                playlist.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => onSelectVideo(index)}
                      className={cn(
                        "w-full text-left p-2 rounded-md text-sm flex items-center gap-3",
                        "hover:bg-muted",
                        index === currentVideoIndex ? "bg-primary/20 text-primary-foreground" : ""
                      )}
                    >
                      {item.type === 'video' ? <ListVideo className="w-4 h-4 shrink-0" /> : <Tv className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{item.name}</span>
                    </button>
                ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PlaylistPanel;
