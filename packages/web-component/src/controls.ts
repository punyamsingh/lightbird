/**
 * Styled, framework-agnostic control bar for `<lightbird-player>`.
 *
 * Plain DOM (no framework) so it can live inside the element's shadow root. It
 * drives a real `<video>` element and mirrors the React player's chrome:
 * play/pause, a scrubber with played fill, time, volume, a subtitle (CC) track
 * picker, picture-in-picture, a settings menu (playback-speed presets + video
 * filters), and fullscreen.
 *
 * `createControlBar` returns the root element plus `update()` (re-sync UI to the
 * media/track state — call after tracks change) and `destroy()`.
 */

export interface ControlBar {
  /** The control-bar root element to append into the shadow root. */
  element: HTMLElement;
  /** Re-sync the controls to the current media/track state. */
  update: () => void;
  /**
   * Supply selectable audio tracks (e.g. from the core MKV/HLS player). The
   * audio button + menu appear only when there are two or more tracks. Pass an
   * empty array to hide them again.
   */
  setAudioTracks: (
    tracks: AudioTrackOption[],
    activeId: string,
    onSelect: (id: string) => void,
  ) => void;
  /** Detach all listeners. Safe to call more than once. */
  destroy: () => void;
}

/** A selectable audio track surfaced in the control bar's audio menu. */
export interface AudioTrackOption {
  id: string;
  name: string;
}

/** Stylesheet for the control bar, concatenated into the element's `<style>`. */
export const CONTROL_STYLES = `
  :host { --lb-accent: #1f9bff; }

  .lb-controls {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 28px 12px 10px;
    font: 13px/1.2 system-ui, sans-serif;
    color: #fff;
    background: linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.35) 55%, transparent);
    opacity: 0;
    transition: opacity .2s ease;
    pointer-events: none;
  }
  :host(:hover) .lb-controls,
  :host(:focus-within) .lb-controls,
  .lb-controls[data-show="1"] { opacity: 1; pointer-events: auto; }

  /* Touch / coarse-pointer devices have no hover — keep the bar reachable. */
  @media (hover: none), (pointer: coarse) {
    .lb-controls { opacity: 1; pointer-events: auto; }
  }

  .lb-row { display: flex; align-items: center; gap: 8px; }
  .lb-spacer { flex: 1; }

  .lb-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: #fff;
    padding: 4px;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    line-height: 0;
  }
  .lb-btn:hover { background: rgba(255,255,255,.15); }
  .lb-btn:focus-visible { outline: 2px solid var(--lb-accent); outline-offset: 1px; }
  .lb-btn svg { width: 20px; height: 20px; fill: currentColor; }
  .lb-btn[hidden] { display: none; }

  .lb-time { font-variant-numeric: tabular-nums; opacity: .9; white-space: nowrap; }
  .lb-cc.lb-active, .lb-pip.lb-active { color: var(--lb-accent); }

  .lb-range {
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,.25);
    cursor: pointer;
    outline: none;
  }
  .lb-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 0;
  }
  .lb-range::-moz-range-thumb {
    width: 12px; height: 12px;
    border: 0;
    border-radius: 50%;
    background: #fff;
  }
  .lb-range:focus-visible { outline: 2px solid var(--lb-accent); outline-offset: 2px; }

  .lb-seek { width: 100%; }
  .lb-volume { width: 80px; }

  /* Pop-up menus (subtitles, settings) */
  .lb-menu {
    position: absolute;
    right: 12px;
    bottom: 50px;
    min-width: 184px;
    max-height: 260px;
    overflow-y: auto;
    padding: 6px;
    border-radius: 10px;
    background: rgba(24,24,27,.97);
    box-shadow: 0 8px 24px rgba(0,0,0,.45);
    display: none;
    flex-direction: column;
    gap: 1px;
  }
  .lb-menu[data-open="1"] { display: flex; }
  .lb-menu-label {
    font-size: 10px;
    letter-spacing: .06em;
    text-transform: uppercase;
    opacity: .55;
    padding: 8px 8px 3px;
  }
  .lb-menu-item {
    appearance: none;
    border: 0;
    background: transparent;
    color: #fff;
    text-align: left;
    padding: 7px 8px;
    border-radius: 6px;
    cursor: pointer;
    font: inherit;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lb-menu-item:hover { background: rgba(255,255,255,.1); }
  .lb-menu-item::before {
    content: "";
    width: 14px;
    flex: 0 0 14px;
    opacity: 0;
  }
  .lb-menu-item.lb-checked { color: var(--lb-accent); }
  .lb-menu-item.lb-checked::before { content: "✓"; opacity: 1; font-size: 12px; }
  .lb-menu-divider { height: 1px; margin: 5px 4px; background: rgba(255,255,255,.12); }
  .lb-filter { padding: 5px 8px 7px; }
  .lb-filter > span { display: flex; justify-content: space-between; font-size: 12px; opacity: .85; margin-bottom: 5px; }
  .lb-filter .lb-range { width: 100%; }
  .lb-reset {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--lb-accent);
    cursor: pointer;
    font: inherit;
    text-align: left;
    padding: 7px 8px;
    border-radius: 6px;
  }
  .lb-reset:hover { background: rgba(255,255,255,.1); }
`;

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13 .41L14.59 8 12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41z"/></svg>',
  cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1z"/></svg>',
  audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>',
  pip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.48.48 0 0014.4 2h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87a.49.49 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/></svg>',
  enterFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  exitFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface FilterSpec {
  key: 'brightness' | 'contrast' | 'saturate' | 'hue';
  label: string;
  min: number;
  max: number;
  unit: string;
  def: number;
}

const FILTERS: FilterSpec[] = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%', def: 100 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%', def: 100 },
  { key: 'saturate', label: 'Saturation', min: 0, max: 200, unit: '%', def: 100 },
  { key: 'hue', label: 'Hue', min: 0, max: 360, unit: '°', def: 0 },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** Paint the played portion of a range input as an accent-coloured fill. */
function paintRange(range: HTMLInputElement, accent = 'var(--lb-accent)'): void {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 1;
  const pct = max > min ? ((Number(range.value) - min) / (max - min)) * 100 : 0;
  range.style.background =
    `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%,` +
    ` rgba(255,255,255,.25) ${pct}%, rgba(255,255,255,.25) 100%)`;
}

function makeButton(cls: string, label: string, icon: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `lb-btn ${cls}`;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-haspopup', 'false');
  btn.innerHTML = icon;
  return btn;
}

/** True when the runtime exposes the Picture-in-Picture API. */
function pipSupported(video: HTMLVideoElement): boolean {
  return (
    typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    (document as Document).pictureInPictureEnabled === true &&
    typeof (video as HTMLVideoElement).requestPictureInPicture === 'function'
  );
}

/**
 * Build the control bar for a media element.
 *
 * @param video  The `<video>` the controls drive.
 * @param host   The element to fullscreen (the custom element host).
 */
export function createControlBar(video: HTMLVideoElement, host: HTMLElement): ControlBar {
  const root = document.createElement('div');
  root.className = 'lb-controls';
  root.setAttribute('part', 'controls');

  // ── Scrubber ──────────────────────────────────────────────────────────
  const seek = document.createElement('input');
  seek.type = 'range';
  seek.className = 'lb-range lb-seek';
  seek.min = '0';
  seek.max = '100';
  seek.step = 'any';
  seek.value = '0';
  seek.setAttribute('aria-label', 'Seek');

  // ── Bottom row ────────────────────────────────────────────────────────
  const row = document.createElement('div');
  row.className = 'lb-row';

  const playBtn = makeButton('lb-play', 'Play', ICONS.play);
  const muteBtn = makeButton('lb-mute', 'Mute', ICONS.volume);

  const volume = document.createElement('input');
  volume.type = 'range';
  volume.className = 'lb-range lb-volume';
  volume.min = '0';
  volume.max = '1';
  volume.step = '0.05';
  volume.value = String(video.volume);
  volume.setAttribute('aria-label', 'Volume');

  const time = document.createElement('span');
  time.className = 'lb-time';
  time.textContent = '0:00 / 0:00';

  const spacer = document.createElement('span');
  spacer.className = 'lb-spacer';

  const audioBtn = makeButton('lb-audio', 'Audio track', ICONS.audio);
  audioBtn.hidden = true;
  // These buttons open pop-up menus — advertise that to assistive tech.
  audioBtn.setAttribute('aria-haspopup', 'menu');
  audioBtn.setAttribute('aria-expanded', 'false');
  const ccBtn = makeButton('lb-cc', 'Subtitles', ICONS.cc);
  ccBtn.hidden = true;
  ccBtn.setAttribute('aria-haspopup', 'menu');
  ccBtn.setAttribute('aria-expanded', 'false');
  const pipBtn = makeButton('lb-pip', 'Picture in picture', ICONS.pip);
  pipBtn.hidden = !pipSupported(video);
  const settingsBtn = makeButton('lb-settings', 'Settings', ICONS.settings);
  settingsBtn.setAttribute('aria-haspopup', 'menu');
  settingsBtn.setAttribute('aria-expanded', 'false');
  const fsBtn = makeButton('lb-fs', 'Fullscreen', ICONS.enterFs);

  row.append(playBtn, muteBtn, volume, time, spacer, audioBtn, ccBtn, pipBtn, settingsBtn, fsBtn);

  // ── Menus ─────────────────────────────────────────────────────────────
  const audioMenu = document.createElement('div');
  audioMenu.className = 'lb-menu lb-audio-menu';
  audioMenu.setAttribute('role', 'menu');

  const subtitleMenu = document.createElement('div');
  subtitleMenu.className = 'lb-menu lb-subtitle-menu';
  subtitleMenu.setAttribute('role', 'menu');

  const settingsMenu = document.createElement('div');
  settingsMenu.className = 'lb-menu lb-settings-menu';
  settingsMenu.setAttribute('role', 'menu');

  // Parallel arrays: triggers[i] opens menus[i] (used for aria + outside-click).
  const menus = [audioMenu, subtitleMenu, settingsMenu];
  const triggers = [audioBtn, ccBtn, settingsBtn];

  root.append(seek, row, audioMenu, subtitleMenu, settingsMenu);

  // ── State / helpers ───────────────────────────────────────────────────
  let scrubbing = false;
  const filterValues: Record<FilterSpec['key'], number> = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0,
  };

  const isFullscreen = (): boolean => document.fullscreenElement === host;
  const isPip = (): boolean =>
    typeof document !== 'undefined' && (document as Document).pictureInPictureElement === video;
  const anyMenuOpen = (): boolean => menus.some((m) => m.dataset.open === '1');

  const refreshShow = (): void => {
    root.dataset.show = video.paused || anyMenuOpen() ? '1' : '0';
  };

  // Keep each trigger's aria-expanded in step with its menu's open state.
  const syncMenuAria = (): void => {
    for (let i = 0; i < menus.length; i++) {
      triggers[i].setAttribute('aria-expanded', String(menus[i].dataset.open === '1'));
    }
  };
  const closeMenus = (except?: HTMLElement): void => {
    for (const m of menus) {
      if (m !== except) m.dataset.open = '0';
    }
    syncMenuAria();
    refreshShow();
  };
  const toggleMenu = (menu: HTMLElement): void => {
    const open = menu.dataset.open === '1';
    closeMenus(menu);
    menu.dataset.open = open ? '0' : '1';
    syncMenuAria();
    refreshShow();
  };

  const applyFilters = (): void => {
    video.style.filter =
      `brightness(${filterValues.brightness}%) contrast(${filterValues.contrast}%)` +
      ` saturate(${filterValues.saturate}%) hue-rotate(${filterValues.hue}deg)`;
  };

  /** Find the currently showing text track index, or -1 for none. */
  const showingTrack = (): number => {
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === 'showing') return i;
    }
    return -1;
  };

  const selectTrack = (index: number): void => {
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === index ? 'showing' : 'disabled';
    }
    syncCc();
  };

  // ── Sync functions ────────────────────────────────────────────────────
  const syncPlay = (): void => {
    playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
    playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    refreshShow();
  };

  const syncVolume = (): void => {
    const muted = video.muted || video.volume === 0;
    muteBtn.innerHTML = muted ? ICONS.muted : ICONS.volume;
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    volume.value = String(muted ? 0 : video.volume);
    paintRange(volume);
  };

  const syncTime = (): void => {
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    if (!scrubbing) {
      seek.max = String(dur || 100);
      seek.value = String(video.currentTime);
      paintRange(seek);
    }
    time.textContent = `${formatTime(video.currentTime)} / ${formatTime(dur)}`;
  };

  const syncPip = (): void => {
    pipBtn.hidden = !pipSupported(video);
    pipBtn.classList.toggle('lb-active', isPip());
  };

  /** Rebuild the subtitle picker from the current text-track list. */
  function syncCc(): void {
    const tracks = video.textTracks;
    const count = tracks.length;
    ccBtn.hidden = count === 0;
    const active = showingTrack();
    ccBtn.classList.toggle('lb-active', active !== -1);

    if (count === 0) {
      subtitleMenu.dataset.open = '0';
      subtitleMenu.replaceChildren();
      return;
    }

    const items: HTMLElement[] = [];
    const label = document.createElement('div');
    label.className = 'lb-menu-label';
    label.textContent = 'Subtitles';
    items.push(label);

    const offItem = document.createElement('button');
    offItem.type = 'button';
    offItem.className = 'lb-menu-item' + (active === -1 ? ' lb-checked' : '');
    offItem.setAttribute('role', 'menuitemradio');
    offItem.setAttribute('aria-checked', String(active === -1));
    offItem.textContent = 'Off';
    offItem.addEventListener('click', () => {
      selectTrack(-1);
      closeMenus();
    });
    items.push(offItem);

    for (let i = 0; i < count; i++) {
      const track = tracks[i];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lb-menu-item' + (active === i ? ' lb-checked' : '');
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(active === i));
      item.textContent = track.label || track.language || `Track ${i + 1}`;
      item.addEventListener('click', () => {
        selectTrack(i);
        closeMenus();
      });
      items.push(item);
    }

    subtitleMenu.replaceChildren(...items);
  }

  // ── Audio-track picker (populated by the host from the core player) ────
  const setAudioTracks = (
    tracks: AudioTrackOption[],
    activeId: string,
    onSelect: (id: string) => void,
  ): void => {
    // A single track is not worth a switcher — hide the affordance entirely.
    if (tracks.length < 2) {
      audioBtn.hidden = true;
      audioMenu.dataset.open = '0';
      audioMenu.replaceChildren();
      audioBtn.setAttribute('aria-expanded', 'false');
      refreshShow();
      return;
    }

    audioBtn.hidden = false;

    const items: HTMLElement[] = [];
    const label = document.createElement('div');
    label.className = 'lb-menu-label';
    label.textContent = 'Audio';
    items.push(label);

    for (const track of tracks) {
      const checked = track.id === activeId;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lb-menu-item' + (checked ? ' lb-checked' : '');
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(checked));
      item.textContent = track.name;
      item.addEventListener('click', () => {
        onSelect(track.id);
        // Reflect the new selection immediately; the host may also re-call us.
        setAudioTracks(tracks, track.id, onSelect);
        closeMenus();
      });
      items.push(item);
    }

    audioMenu.replaceChildren(...items);
  };

  // ── Settings menu (built once; values synced on open) ─────────────────
  const speedItems: HTMLButtonElement[] = [];
  const filterInputs = new Map<FilterSpec['key'], { input: HTMLInputElement; value: HTMLSpanElement }>();

  function buildSettingsMenu(): void {
    const speedLabel = document.createElement('div');
    speedLabel.className = 'lb-menu-label';
    speedLabel.textContent = 'Playback speed';
    settingsMenu.appendChild(speedLabel);

    for (const speed of SPEEDS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lb-menu-item';
      item.setAttribute('role', 'menuitemradio');
      item.dataset.speed = String(speed);
      item.textContent = speed === 1 ? 'Normal' : `${speed}x`;
      item.addEventListener('click', () => {
        video.playbackRate = speed;
        syncSettings();
      });
      speedItems.push(item);
      settingsMenu.appendChild(item);
    }

    const divider = document.createElement('div');
    divider.className = 'lb-menu-divider';
    settingsMenu.appendChild(divider);

    const displayLabel = document.createElement('div');
    displayLabel.className = 'lb-menu-label';
    displayLabel.textContent = 'Display';
    settingsMenu.appendChild(displayLabel);

    for (const spec of FILTERS) {
      const wrap = document.createElement('div');
      wrap.className = 'lb-filter';

      const head = document.createElement('span');
      const name = document.createElement('span');
      name.textContent = spec.label;
      const value = document.createElement('span');
      head.append(name, value);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'lb-range';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.value = String(spec.def);
      input.setAttribute('aria-label', spec.label);
      input.addEventListener('input', () => {
        filterValues[spec.key] = Number(input.value);
        value.textContent = `${input.value}${spec.unit}`;
        paintRange(input);
        applyFilters();
      });

      wrap.append(head, input);
      settingsMenu.appendChild(wrap);
      filterInputs.set(spec.key, { input, value });
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'lb-reset';
    reset.textContent = 'Reset display';
    reset.addEventListener('click', () => {
      for (const spec of FILTERS) filterValues[spec.key] = spec.def;
      applyFilters();
      syncSettings();
    });
    settingsMenu.appendChild(reset);
  }

  function syncSettings(): void {
    for (const item of speedItems) {
      const checked = Number(item.dataset.speed) === video.playbackRate;
      item.classList.toggle('lb-checked', checked);
      item.setAttribute('aria-checked', String(checked));
    }
    for (const spec of FILTERS) {
      const entry = filterInputs.get(spec.key);
      if (!entry) continue;
      entry.input.value = String(filterValues[spec.key]);
      entry.value.textContent = `${filterValues[spec.key]}${spec.unit}`;
      paintRange(entry.input);
    }
  }

  buildSettingsMenu();

  const update = (): void => {
    syncPlay();
    syncVolume();
    syncTime();
    syncPip();
    syncCc();
    syncSettings();
  };

  // ── Media-element listeners ───────────────────────────────────────────
  const onPlay = syncPlay;
  const onPause = syncPlay;
  const onTime = syncTime;
  const onDuration = syncTime;
  const onVol = syncVolume;
  const onRate = syncSettings;
  const onFsChange = (): void => {
    fsBtn.innerHTML = isFullscreen() ? ICONS.exitFs : ICONS.enterFs;
    fsBtn.setAttribute('aria-label', isFullscreen() ? 'Exit fullscreen' : 'Fullscreen');
  };
  const onPipChange = syncPip;

  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('durationchange', onDuration);
  video.addEventListener('loadedmetadata', onDuration);
  video.addEventListener('volumechange', onVol);
  video.addEventListener('ratechange', onRate);
  video.addEventListener('enterpictureinpicture', onPipChange);
  video.addEventListener('leavepictureinpicture', onPipChange);
  document.addEventListener('fullscreenchange', onFsChange);

  const trackList = video.textTracks;
  trackList.addEventListener?.('addtrack', syncCc);
  trackList.addEventListener?.('removetrack', syncCc);
  trackList.addEventListener?.('change', syncCc);

  // Close menus on a click anywhere outside a menu or its trigger.
  const onDocPointerDown = (e: Event): void => {
    if (!anyMenuOpen()) return;
    const path = e.composedPath();
    const inside = menus.some((m) => path.includes(m)) || triggers.some((t) => path.includes(t));
    if (!inside) closeMenus();
  };
  document.addEventListener('pointerdown', onDocPointerDown, true);

  // ── Control interactions ──────────────────────────────────────────────
  const onPlayClick = (): void => {
    if (video.paused) void video.play();
    else video.pause();
  };
  const onMuteClick = (): void => {
    video.muted = !video.muted;
  };
  const onVolumeInput = (): void => {
    const v = Number(volume.value);
    video.volume = v;
    video.muted = v === 0;
  };
  const onSeekStart = (): void => {
    scrubbing = true;
  };
  const onSeekInput = (): void => {
    paintRange(seek);
    time.textContent = `${formatTime(Number(seek.value))} / ${formatTime(video.duration || 0)}`;
  };
  const onSeekCommit = (): void => {
    video.currentTime = Number(seek.value);
    scrubbing = false;
  };
  const onAudioClick = (): void => toggleMenu(audioMenu);
  const onCcClick = (): void => toggleMenu(subtitleMenu);
  const onSettingsClick = (): void => {
    syncSettings();
    toggleMenu(settingsMenu);
  };
  const onPipClick = (): void => {
    if (!pipSupported(video)) return;
    if (isPip()) void (document as Document).exitPictureInPicture?.();
    else void video.requestPictureInPicture?.();
  };
  const onFsClick = (): void => {
    if (isFullscreen()) void document.exitFullscreen?.();
    else void host.requestFullscreen?.();
  };

  playBtn.addEventListener('click', onPlayClick);
  muteBtn.addEventListener('click', onMuteClick);
  volume.addEventListener('input', onVolumeInput);
  seek.addEventListener('pointerdown', onSeekStart);
  seek.addEventListener('input', onSeekInput);
  seek.addEventListener('change', onSeekCommit);
  audioBtn.addEventListener('click', onAudioClick);
  ccBtn.addEventListener('click', onCcClick);
  settingsBtn.addEventListener('click', onSettingsClick);
  pipBtn.addEventListener('click', onPipClick);
  fsBtn.addEventListener('click', onFsClick);

  update();
  onFsChange();

  const destroy = (): void => {
    video.removeEventListener('play', onPlay);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('timeupdate', onTime);
    video.removeEventListener('durationchange', onDuration);
    video.removeEventListener('loadedmetadata', onDuration);
    video.removeEventListener('volumechange', onVol);
    video.removeEventListener('ratechange', onRate);
    video.removeEventListener('enterpictureinpicture', onPipChange);
    video.removeEventListener('leavepictureinpicture', onPipChange);
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('pointerdown', onDocPointerDown, true);
    trackList.removeEventListener?.('addtrack', syncCc);
    trackList.removeEventListener?.('removetrack', syncCc);
    trackList.removeEventListener?.('change', syncCc);
    root.remove();
  };

  return { element: root, update, setAudioTracks, destroy };
}
