import { useState, useRef, useCallback, useEffect } from "react";
import type { Subtitle } from "../types";
import { UniversalSubtitleManager } from "../subtitles/subtitle-manager";

export interface UseSubtitlesOptions {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function useSubtitles(options?: UseSubtitlesOptions) {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState("-1");
  const managerRef = useRef<UniversalSubtitleManager | null>(null);

  // Destroy manager on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  const initManager = useCallback((videoEl: HTMLVideoElement) => {
    managerRef.current?.destroy();
    managerRef.current = new UniversalSubtitleManager(videoEl);
  }, []);

  const importSubtitles = useCallback((subs: Subtitle[]) => {
    if (!managerRef.current) return;
    managerRef.current.importSubtitles(subs);
    setSubtitles(managerRef.current.getSubtitles());
  }, []);

  const reset = useCallback(() => {
    managerRef.current?.destroy();
    managerRef.current = null;
    setSubtitles([]);
    setActiveSubtitle("-1");
  }, []);

  const addSubtitleFiles = useCallback(
    async (files: File[]) => {
      if (!managerRef.current) return;
      try {
        await managerRef.current.addSubtitleFiles(files);
        setSubtitles(managerRef.current.getSubtitles());
        options?.onSuccess?.(`Added ${files.length} subtitle file(s).`);
      } catch (error) {
        console.error("Failed to add subtitles:", error);
        options?.onError?.("Failed to add subtitles");
      }
    },
    [options]
  );

  const removeSubtitle = useCallback(
    (id: string) => {
      if (!managerRef.current) return;
      const success = managerRef.current.removeSubtitle(id);
      if (success) {
        setSubtitles(managerRef.current.getSubtitles());
        if (activeSubtitle === id) {
          setActiveSubtitle("-1");
          managerRef.current.switchSubtitle("-1");
        }
        options?.onSuccess?.("Subtitle removed");
      }
    },
    [activeSubtitle, options]
  );

  const switchSubtitle = useCallback((id: string) => {
    setActiveSubtitle(id);
    managerRef.current?.switchSubtitle(id);
  }, []);

  return {
    subtitles,
    activeSubtitle,
    managerRef,
    initManager,
    importSubtitles,
    reset,
    addSubtitleFiles,
    removeSubtitle,
    switchSubtitle,
  };
}
