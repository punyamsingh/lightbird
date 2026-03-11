"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PlaylistItem } from "@/types";

const VIDEO_EXTENSIONS = [".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mp4"];
const SUBTITLE_EXTENSIONS = [".srt", ".vtt", ".ass", ".ssa"];

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const playlistRef = useRef(playlist);

  useEffect(() => {
    playlistRef.current = playlist;
  });

  // Revoke remaining blob URLs on unmount
  useEffect(() => {
    return () => {
      playlistRef.current.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const currentItem = currentIndex !== null ? (playlist[currentIndex] ?? null) : null;

  const selectItem = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const appendItem = useCallback((item: PlaylistItem) => {
    setPlaylist((p) => [...p, item]);
  }, []);

  const replaceWithFile = useCallback((file: File) => {
    setPlaylist((prev) => {
      // Revoke previous blob URLs for local files
      prev.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.url);
      });
      return [
        {
          name: file.name,
          url: URL.createObjectURL(file),
          type: "video",
          file,
        },
      ];
    });
    setCurrentIndex(0);
  }, []);

  const nextItem = useCallback(() => {
    setCurrentIndex((idx) => {
      if (idx === null || playlistRef.current.length <= 1) return idx;
      return (idx + 1) % playlistRef.current.length;
    });
  }, []);

  const prevItem = useCallback(() => {
    setCurrentIndex((idx) => {
      if (idx === null || playlistRef.current.length <= 1) return idx;
      return (idx - 1 + playlistRef.current.length) % playlistRef.current.length;
    });
  }, []);

  const parseFiles = useCallback(
    (files: FileList): { videoFiles: File[]; subtitleFiles: File[] } => {
      const videoFiles: File[] = [];
      const subtitleFiles: File[] = [];
      Array.from(files).forEach((file) => {
        const fileName = file.name.toLowerCase();
        if (
          file.type.startsWith("video/") ||
          VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext))
        ) {
          videoFiles.push(file);
        } else if (SUBTITLE_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
          subtitleFiles.push(file);
        }
      });
      return { videoFiles, subtitleFiles };
    },
    []
  );

  return {
    playlist,
    currentIndex,
    currentItem,
    selectItem,
    appendItem,
    replaceWithFile,
    nextItem,
    prevItem,
    parseFiles,
    setPlaylist,
    setCurrentIndex,
  };
}
