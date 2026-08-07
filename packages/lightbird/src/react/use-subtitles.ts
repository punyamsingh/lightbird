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

  /**
   * Adds a subtitle from raw text (used by the online search) and switches to
   * it immediately — a downloaded subtitle you have to then go and enable is a
   * worse experience than one that just appears.
   */
  const addSubtitleFromText = useCallback(
    async (
      content: string,
      fileName: string,
      lang: string,
      format: "vtt" | "srt" | "ass" | "ssa" = "srt"
    ) => {
      // Captured before the await: loading another video swaps in a new
      // manager, and an id from the old one means nothing to the new one.
      const manager = managerRef.current;
      if (!manager) return null;
      try {
        const subtitle = await manager.addSubtitleFromText(
          content,
          fileName,
          lang,
          format
        );
        if (managerRef.current !== manager) return null;
        setSubtitles(manager.getSubtitles());
        setActiveSubtitle(subtitle.id);
        manager.switchSubtitle(subtitle.id);
        options?.onSuccess?.(`Applied ${subtitle.name}`);
        return subtitle;
      } catch (error) {
        console.error("Failed to add downloaded subtitle:", error);
        options?.onError?.("Failed to apply subtitle");
        return null;
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
    addSubtitleFromText,
    removeSubtitle,
    switchSubtitle,
  };
}
