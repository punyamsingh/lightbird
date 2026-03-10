# Plan 08 — Keyboard Shortcut Customization

## Problem

Keyboard shortcuts are hardcoded in the `keydown` handler inside `LightBirdPlayer`. Users cannot:
- Change which key does what.
- Disable shortcuts that conflict with their OS or assistive technology.
- Discover what shortcuts exist (no help overlay).
- Add their own bindings.

Additionally, the current shortcut system has a gap: it only guards against `<input>` elements. If a future `<textarea>` or `contentEditable` element is added, shortcuts could fire unexpectedly.

## Goal

- Store shortcuts in a configurable registry.
- Provide a Settings dialog where users can view and remap shortcuts.
- Persist custom bindings to `localStorage`.
- Add a `?` key toggle for a keyboard shortcut reference overlay.
- Harden the shortcut guard against all interactive elements.

---

## Step-by-Step Implementation

### Step 1 — Define the Shortcut Registry

Create `src/lib/keyboard-shortcuts.ts`:

```ts
export type ShortcutAction =
  | 'play-pause'
  | 'seek-forward-5'
  | 'seek-backward-5'
  | 'seek-forward-30'
  | 'seek-backward-30'
  | 'volume-up'
  | 'volume-down'
  | 'mute'
  | 'fullscreen'
  | 'next-item'
  | 'prev-item'
  | 'screenshot'
  | 'show-shortcuts';

export interface ShortcutBinding {
  action: ShortcutAction;
  label: string;             // human-readable description
  defaultKey: string;        // e.g. 'Space', 'ArrowRight', 'f'
  key: string;               // current (possibly remapped) key
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'play-pause',      label: 'Play / Pause',          defaultKey: ' ',           key: ' ' },
  { action: 'seek-forward-5',  label: 'Seek Forward 5s',       defaultKey: 'ArrowRight',  key: 'ArrowRight' },
  { action: 'seek-backward-5', label: 'Seek Backward 5s',      defaultKey: 'ArrowLeft',   key: 'ArrowLeft' },
  { action: 'seek-forward-30', label: 'Seek Forward 30s',      defaultKey: 'ArrowRight',  key: 'ArrowRight', modifiers: { shift: true } },
  { action: 'seek-backward-30',label: 'Seek Backward 30s',     defaultKey: 'ArrowLeft',   key: 'ArrowLeft',  modifiers: { shift: true } },
  { action: 'volume-up',       label: 'Volume Up',             defaultKey: 'ArrowUp',     key: 'ArrowUp' },
  { action: 'volume-down',     label: 'Volume Down',           defaultKey: 'ArrowDown',   key: 'ArrowDown' },
  { action: 'mute',            label: 'Toggle Mute',           defaultKey: 'm',           key: 'm' },
  { action: 'fullscreen',      label: 'Toggle Fullscreen',     defaultKey: 'f',           key: 'f' },
  { action: 'next-item',       label: 'Next in Playlist',      defaultKey: 'n',           key: 'n' },
  { action: 'prev-item',       label: 'Previous in Playlist',  defaultKey: 'p',           key: 'p' },
  { action: 'screenshot',      label: 'Screenshot',            defaultKey: 's',           key: 's', modifiers: { ctrl: true } },
  { action: 'show-shortcuts',  label: 'Show Shortcuts Help',   defaultKey: '?',           key: '?' },
];

const STORAGE_KEY = 'lightbird-shortcuts';

export function loadShortcuts(): ShortcutBinding[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SHORTCUTS;
    const overrides: Record<ShortcutAction, string> = JSON.parse(saved);
    return DEFAULT_SHORTCUTS.map(s => ({
      ...s,
      key: overrides[s.action] ?? s.defaultKey,
    }));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(bindings: ShortcutBinding[]): void {
  const overrides: Record<string, string> = {};
  for (const b of bindings) {
    if (b.key !== b.defaultKey) overrides[b.action] = b.key;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function matchesShortcut(e: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (e.key.toLowerCase() !== binding.key.toLowerCase() && e.key !== binding.key) return false;
  if (binding.modifiers?.ctrl && !e.ctrlKey) return false;
  if (binding.modifiers?.shift && !e.shiftKey) return false;
  if (binding.modifiers?.alt && !e.altKey) return false;
  // Don't match unintended modifiers
  if (!binding.modifiers?.ctrl && e.ctrlKey) return false;
  if (!binding.modifiers?.shift && e.shiftKey) return false;
  if (!binding.modifiers?.alt && e.altKey) return false;
  return true;
}

export function isInteractiveElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return ['input', 'textarea', 'select', 'button', 'a'].includes(tag) || el.isContentEditable;
}
```

### Step 2 — Refactor `useKeyboardShortcuts` Hook

Rewrite to use the registry:

```ts
export function useKeyboardShortcuts(
  shortcuts: ShortcutBinding[],
  handlers: Record<ShortcutAction, () => void>
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
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts, handlers]);
}
```

In `LightBirdPlayer`, load shortcuts on mount:

```ts
const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(() => loadShortcuts());

const shortcutHandlers: Record<ShortcutAction, () => void> = useMemo(() => ({
  'play-pause': playback.togglePlay,
  'seek-forward-5': () => playback.seek(playback.currentTime + 5),
  'seek-backward-5': () => playback.seek(playback.currentTime - 5),
  'seek-forward-30': () => playback.seek(playback.currentTime + 30),
  'seek-backward-30': () => playback.seek(playback.currentTime - 30),
  'volume-up': () => playback.setVolume(Math.min(1, playback.volume + 0.05)),
  'volume-down': () => playback.setVolume(Math.max(0, playback.volume - 0.05)),
  'mute': playback.toggleMute,
  'fullscreen': fullscreen.toggle,
  'next-item': playlist.nextItem,
  'prev-item': playlist.prevItem,
  'screenshot': handleScreenshot,
  'show-shortcuts': () => setShowShortcutsHelp(true),
}), [playback, fullscreen, playlist]);

useKeyboardShortcuts(shortcuts, shortcutHandlers);
```

### Step 3 — Keyboard Shortcut Settings Dialog

Create `src/components/shortcut-settings-dialog.tsx`:

```tsx
export function ShortcutSettingsDialog({ shortcuts, onSave, onClose }: Props) {
  const [editing, setEditing] = useState<ShortcutBinding[]>(shortcuts);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  function startCapture(action: ShortcutAction) {
    setCapturing(action);
  }

  useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') { setCapturing(null); return; }
      // Check for conflicts
      const conflict = editing.find(b => b.action !== capturing && matchesShortcut(e, { ...b, key: e.key }));
      if (conflict) {
        toast({ title: `Conflicts with "${conflict.label}"`, variant: 'destructive' });
        return;
      }
      setEditing(prev => prev.map(b => b.action === capturing ? { ...b, key: e.key, modifiers: { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey } } : b));
      setCapturing(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [capturing, editing]);

  function formatKey(binding: ShortcutBinding): string {
    const mods = [];
    if (binding.modifiers?.ctrl) mods.push('Ctrl');
    if (binding.modifiers?.shift) mods.push('Shift');
    if (binding.modifiers?.alt) mods.push('Alt');
    const key = binding.key === ' ' ? 'Space' : binding.key;
    return [...mods, key].join(' + ');
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {editing.map(binding => (
            <div key={binding.action} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
              <span className="text-sm">{binding.label}</span>
              <button
                onClick={() => startCapture(binding.action)}
                className={`font-mono text-xs px-2 py-1 rounded border ${capturing === binding.action ? 'border-primary animate-pulse' : 'border-muted-foreground'}`}
              >
                {capturing === binding.action ? 'Press key...' : formatKey(binding)}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => setEditing(DEFAULT_SHORTCUTS)}>Reset to Defaults</Button>
          <Button onClick={() => { saveShortcuts(editing); onSave(editing); onClose(); }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4 — Keyboard Shortcut Help Overlay

When `show-shortcuts` action fires (default: `?`), show a read-only overlay:

```tsx
{showShortcutsHelp && (
  <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowShortcutsHelp(false)}>
    <div className="bg-card rounded-lg p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
      <div className="space-y-1">
        {shortcuts.map(b => (
          <div key={b.action} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{b.label}</span>
            <kbd className="font-mono bg-muted px-1.5 rounded text-xs">{formatKey(b)}</kbd>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">Press ? or Esc to close</p>
    </div>
  </div>
)}
```

### Step 5 — Add Settings Button to UI

Add a settings/gear icon button to `PlayerControls` that opens `ShortcutSettingsDialog`:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" onClick={onOpenSettings}>
      <Settings className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Settings</TooltipContent>
</Tooltip>
```

---

## Files to Create/Modify

| Action | Path |
|---|---|
| Create | `src/lib/keyboard-shortcuts.ts` |
| Modify | `src/hooks/use-keyboard-shortcuts.ts` |
| Create | `src/components/shortcut-settings-dialog.tsx` |
| Modify | `src/components/lightbird-player.tsx` (load shortcuts, wire handlers, help overlay) |
| Modify | `src/components/player-controls.tsx` (add settings button) |

---

## Success Criteria

- Pressing `?` shows a readable shortcut reference overlay.
- Opening Settings → Keyboard Shortcuts lists all actions.
- Clicking a shortcut and pressing a new key reassigns it; pressing Esc cancels.
- Assigning a key already used by another action shows a conflict error.
- Custom bindings persist across page refreshes.
- Resetting to defaults restores all factory keys.
- Shortcuts do not fire when focus is inside an input, textarea, select, or contentEditable element.
