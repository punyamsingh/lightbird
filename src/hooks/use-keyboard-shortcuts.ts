"use client";

import { useEffect } from "react";
import { isInteractiveElement, matchesShortcut } from "@/lib/keyboard-shortcuts";
import type { ShortcutBinding, ShortcutAction } from "@/lib/keyboard-shortcuts";

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

export function useKeyboardShortcuts(
  shortcuts: ShortcutBinding[],
  handlers: ShortcutHandlers
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInteractiveElement(document.activeElement)) return;

      for (const binding of shortcuts) {
        if (matchesShortcut(e, binding)) {
          e.preventDefault();
          handlers[binding.action]?.();
          break;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts, handlers]);
}
