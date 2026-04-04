import React, { useState, useEffect } from "react";
import {
  DEFAULT_SHORTCUTS,
  saveShortcuts,
  formatShortcutKey,
  matchesShortcut,
} from "lightbird";
import type { ShortcutBinding, ShortcutAction } from "lightbird";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./primitives/dialog";
import { Button } from "./primitives/button";
import { useToast } from "./hooks/use-toast";

interface ShortcutSettingsDialogProps {
  shortcuts: ShortcutBinding[];
  onSave: (bindings: ShortcutBinding[]) => void;
  onClose: () => void;
}

export function ShortcutSettingsDialog({
  shortcuts,
  onSave,
  onClose,
}: ShortcutSettingsDialogProps) {
  const [editing, setEditing] = useState<ShortcutBinding[]>(shortcuts);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!capturing) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setCapturing(null);
        return;
      }
      // Check for conflicts with other bindings
      const conflict = editing.find(
        (b) =>
          b.action !== capturing &&
          matchesShortcut(e, {
            ...b,
            key: e.key,
            modifiers: {
              ctrl: e.ctrlKey,
              shift: e.shiftKey,
              alt: e.altKey,
            },
          })
      );
      if (conflict) {
        toast({
          title: `Conflicts with "${conflict.label}"`,
          variant: "destructive",
        });
        return;
      }
      setEditing((prev) =>
        prev.map((b) =>
          b.action === capturing
            ? {
                ...b,
                key: e.key,
                modifiers: {
                  ctrl: e.ctrlKey,
                  shift: e.shiftKey,
                  alt: e.altKey,
                },
              }
            : b
        )
      );
      setCapturing(null);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [capturing, editing, toast]);

  const handleSave = () => {
    saveShortcuts(editing);
    onSave(editing);
    onClose();
  };

  const handleReset = () => {
    setEditing(DEFAULT_SHORTCUTS);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {editing.map((binding) => (
            <div
              key={binding.action}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted"
            >
              <span className="text-sm">{binding.label}</span>
              <button
                onClick={() => setCapturing(binding.action)}
                className={`font-mono text-xs px-2 py-1 rounded border ${
                  capturing === binding.action
                    ? "border-primary animate-pulse"
                    : "border-muted-foreground"
                }`}
              >
                {capturing === binding.action
                  ? "Press key..."
                  : formatShortcutKey(binding)}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
