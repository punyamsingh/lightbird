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
  | 'show-shortcuts'
  | 'next-chapter'
  | 'prev-chapter'
  | 'frame-step-forward'
  | 'frame-step-backward'
  | 'loop-toggle'
  | 'ab-loop-cycle';

export interface ShortcutBinding {
  action: ShortcutAction;
  label: string;
  defaultKey: string;
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'play-pause',       label: 'Play / Pause',         defaultKey: ' ',          key: ' ' },
  { action: 'seek-forward-5',   label: 'Seek Forward 5s',      defaultKey: 'ArrowRight', key: 'ArrowRight' },
  { action: 'seek-backward-5',  label: 'Seek Backward 5s',     defaultKey: 'ArrowLeft',  key: 'ArrowLeft' },
  { action: 'seek-forward-30',  label: 'Seek Forward 30s',     defaultKey: 'ArrowRight', key: 'ArrowRight', modifiers: { shift: true } },
  { action: 'seek-backward-30', label: 'Seek Backward 30s',    defaultKey: 'ArrowLeft',  key: 'ArrowLeft',  modifiers: { shift: true } },
  { action: 'volume-up',        label: 'Volume Up',            defaultKey: 'ArrowUp',    key: 'ArrowUp' },
  { action: 'volume-down',      label: 'Volume Down',          defaultKey: 'ArrowDown',  key: 'ArrowDown' },
  { action: 'mute',             label: 'Toggle Mute',          defaultKey: 'm',          key: 'm' },
  { action: 'fullscreen',       label: 'Toggle Fullscreen',    defaultKey: 'f',          key: 'f' },
  { action: 'next-item',        label: 'Next in Playlist',     defaultKey: 'n',          key: 'n' },
  { action: 'prev-item',        label: 'Previous in Playlist', defaultKey: 'p',          key: 'p' },
  { action: 'screenshot',       label: 'Screenshot',           defaultKey: 's',          key: 's', modifiers: { ctrl: true } },
  { action: 'show-shortcuts',   label: 'Show Shortcuts Help',  defaultKey: '?',          key: '?' },
  { action: 'next-chapter',     label: 'Next Chapter',         defaultKey: ']',          key: ']' },
  { action: 'prev-chapter',     label: 'Previous Chapter',     defaultKey: '[',          key: '[' },
  { action: 'frame-step-forward',  label: 'Step Forward One Frame',  defaultKey: '.', key: '.' },
  { action: 'frame-step-backward', label: 'Step Backward One Frame', defaultKey: ',', key: ',' },
  { action: 'loop-toggle',         label: 'Toggle Loop',             defaultKey: 'l', key: 'l' },
  { action: 'ab-loop-cycle',       label: 'A-B Loop (Set/Cycle)',    defaultKey: 'r', key: 'r' },
];

const STORAGE_KEY = 'lightbird-shortcuts';

export function loadShortcuts(): ShortcutBinding[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SHORTCUTS;
    const overrides: Partial<Record<ShortcutAction, string>> = JSON.parse(saved);
    return DEFAULT_SHORTCUTS.map(s => ({
      ...s,
      key: overrides[s.action] ?? s.defaultKey,
    }));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(bindings: ShortcutBinding[]): void {
  const overrides: Partial<Record<ShortcutAction, string>> = {};
  for (const b of bindings) {
    if (b.key !== b.defaultKey) overrides[b.action] = b.key;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function matchesShortcut(e: KeyboardEvent, binding: ShortcutBinding): boolean {
  const keyMatches =
    e.key === binding.key ||
    e.key.toLowerCase() === binding.key.toLowerCase();
  if (!keyMatches) return false;
  if (!!binding.modifiers?.ctrl !== e.ctrlKey) return false;
  if (!!binding.modifiers?.shift !== e.shiftKey) return false;
  if (!!binding.modifiers?.alt !== e.altKey) return false;
  return true;
}

export function isInteractiveElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  // Block only real text-entry surfaces. Buttons/links are skipped so
  // shortcuts keep working after the user clicks any toolbar control —
  // VLC / YouTube / Spotify behave the same way.
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  if (el.contentEditable === 'true' || el.getAttribute('contenteditable') !== null) return true;
  // Honour open dialogs / popover content so a focused radio/menu item
  // there can still consume Space/Enter/arrow keys.
  if (
    typeof el.closest === 'function' &&
    el.closest(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-popper-content-wrapper]',
    )
  ) {
    return true;
  }
  return false;
}

export function formatShortcutKey(binding: ShortcutBinding): string {
  const mods: string[] = [];
  if (binding.modifiers?.ctrl) mods.push('Ctrl');
  if (binding.modifiers?.shift) mods.push('Shift');
  if (binding.modifiers?.alt) mods.push('Alt');
  const key = binding.key === ' ' ? 'Space' : binding.key;
  return [...mods, key].join(' + ');
}
