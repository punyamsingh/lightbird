import { useState, useCallback, useEffect, useRef } from "react";
import type { PlaylistItem } from "../types";

const VIDEO_EXTENSIONS = [".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mp4", ".m4v"];
const SUBTITLE_EXTENSIONS = [".srt", ".vtt", ".ass", ".ssa"];
const STORAGE_KEY = "lightbird-playlist";

async function getFileDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => resolve(el.duration);
    el.onerror = () => resolve(0);
  });
}

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const playlistRef = useRef(playlist);

  useEffect(() => {
    playlistRef.current = playlist;
  });

  // Restore persisted stream items on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const items: PlaylistItem[] = JSON.parse(saved).filter(
          (i: PlaylistItem) => i.type === "stream"
        );
        if (items.length > 0) setPlaylist(items);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist stream items whenever playlist changes
  useEffect(() => {
    try {
      const serializable = playlist.filter((i) => i.type === "stream");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore storage errors
    }
  }, [playlist]);

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

  const removeItem = useCallback(
    (index: number) => {
      setPlaylist((prev) => {
        const item = prev[index];
        if (item?.file) URL.revokeObjectURL(item.url);
        return prev.filter((_, i) => i !== index);
      });
      setCurrentIndex((idx) => {
        if (idx === null) return idx;
        if (index === idx) {
          // Move to next if possible, otherwise previous
          const newLen = playlistRef.current.length - 1;
          if (newLen === 0) return null;
          return Math.min(idx, newLen - 1);
        }
        if (index < idx) return idx - 1;
        return idx;
      });
    },
    []
  );

  const reorderItems = useCallback((newPlaylist: PlaylistItem[]) => {
    setPlaylist(newPlaylist);
    // Keep currentIndex pointing to the same item
    setCurrentIndex((idx) => {
      if (idx === null) return idx;
      const currentItem = playlistRef.current[idx];
      if (!currentItem) return idx;
      const newIdx = newPlaylist.findIndex((i) => i.id === currentItem.id);
      return newIdx === -1 ? idx : newIdx;
    });
  }, []);

  const replaceWithFile = useCallback((file: File) => {
    setPlaylist((prev) => {
      prev.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.url);
      });
      const url = URL.createObjectURL(file);
      return [
        {
          id: crypto.randomUUID(),
          name: file.name,
          url,
          type: "video",
          file,
        },
      ];
    });
    setCurrentIndex(0);
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const items = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const duration = await getFileDuration(url);
        return {
          id: crypto.randomUUID(),
          name: file.name,
          url,
          type: "video" as const,
          file,
          duration,
        };
      })
    );
    setPlaylist((prev) => [...prev, ...items]);
    return items;
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
    removeItem,
    reorderItems,
    addFiles,
    replaceWithFile,
    nextItem,
    prevItem,
    parseFiles,
    setPlaylist,
    setCurrentIndex,
  };
}
