"use client";

import { useState, useRef, useCallback } from "react";
import type { Subtitle } from "@/types";
import { UniversalSubtitleManager } from "@/lib/subtitle-manager";
import { useToast } from "@/hooks/use-toast";

export function useSubtitles() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState("-1");
  const managerRef = useRef<UniversalSubtitleManager | null>(null);
  const { toast } = useToast();

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
        toast({
          title: "Subtitles added",
          description: `Added ${files.length} subtitle file(s).`,
        });
      } catch (error) {
        console.error("Failed to add subtitles:", error);
        toast({
          title: "Failed to add subtitles",
          description: "There was an error adding the subtitle files.",
          variant: "destructive",
        });
      }
    },
    [toast]
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
        toast({
          title: "Subtitle removed",
          description: "The subtitle track has been removed.",
        });
      }
    },
    [activeSubtitle, toast]
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
