/**
 * Styled, framework-agnostic control bar for `<lightbird-player>`.
 *
 * This is plain DOM (no framework) so it can live inside the element's shadow
 * root. It drives a real `<video>` element and mirrors the look/feel of the
 * React player's chrome: play/pause, a scrubber with buffered + played fill,
 * time, volume, playback speed, a subtitle (CC) toggle, and fullscreen.
 *
 * `createControlBar` returns the root element plus `update()` (re-sync UI to the
 * media state — call after track changes) and `destroy()` (remove listeners).
 */

export interface ControlBar {
  /** The control-bar root element to append into the shadow root. */
  element: HTMLElement;
  /** Re-sync the controls to the current media/track state. */
  update: () => void;
  /** Detach all listeners. Safe to call more than once. */
  destroy: () => void;
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
  .lb-controls[data-show="1"] { opacity: 1; pointer-events: auto; }

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
  .lb-speed { font-size: 12px; min-width: 34px; font-variant-numeric: tabular-nums; }
  .lb-cc.lb-active { color: var(--lb-accent); }

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
`;

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13 .41L14.59 8 12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41z"/></svg>',
  cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1z"/></svg>',
  enterFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  exitFs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

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
  btn.innerHTML = icon;
  return btn;
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

  const speedBtn = makeButton('lb-speed', 'Playback speed', '');
  speedBtn.textContent = '1x';

  const ccBtn = makeButton('lb-cc', 'Subtitles', ICONS.cc);
  ccBtn.hidden = true;

  const fsBtn = makeButton('lb-fs', 'Fullscreen', ICONS.enterFs);

  row.append(playBtn, muteBtn, volume, time, spacer, speedBtn, ccBtn, fsBtn);
  root.append(seek, row);

  // ── State / handlers ──────────────────────────────────────────────────
  let scrubbing = false;

  const isFullscreen = (): boolean => document.fullscreenElement === host;

  const syncPlay = (): void => {
    playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
    playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    // Keep the bar pinned open while paused so it's discoverable.
    root.dataset.show = video.paused ? '1' : '0';
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

  const syncSpeed = (): void => {
    speedBtn.textContent = `${video.playbackRate}x`;
  };

  /** Find the currently showing text track index, or -1 for none. */
  const showingTrack = (): number => {
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === 'showing') return i;
    }
    return -1;
  };

  const syncCc = (): void => {
    const count = video.textTracks.length;
    ccBtn.hidden = count === 0;
    ccBtn.classList.toggle('lb-active', showingTrack() !== -1);
  };

  const update = (): void => {
    syncPlay();
    syncVolume();
    syncTime();
    syncSpeed();
    syncCc();
  };

  // Listeners on the media element
  const onPlay = syncPlay;
  const onPause = syncPlay;
  const onTime = syncTime;
  const onDuration = syncTime;
  const onVol = syncVolume;
  const onRate = syncSpeed;
  const onFsChange = (): void => {
    fsBtn.innerHTML = isFullscreen() ? ICONS.exitFs : ICONS.enterFs;
    fsBtn.setAttribute('aria-label', isFullscreen() ? 'Exit fullscreen' : 'Fullscreen');
  };

  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('durationchange', onDuration);
  video.addEventListener('loadedmetadata', onDuration);
  video.addEventListener('volumechange', onVol);
  video.addEventListener('ratechange', onRate);
  document.addEventListener('fullscreenchange', onFsChange);

  // Text tracks can be added/removed asynchronously (subtitles).
  const trackList = video.textTracks;
  trackList.addEventListener?.('addtrack', syncCc);
  trackList.addEventListener?.('removetrack', syncCc);
  trackList.addEventListener?.('change', syncCc);

  // Control interactions
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
  const onSpeedClick = (): void => {
    const idx = SPEEDS.indexOf(video.playbackRate);
    video.playbackRate = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
  };
  const onCcClick = (): void => {
    const tracks = video.textTracks;
    if (tracks.length === 0) return;
    const current = showingTrack();
    for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'disabled';
    // Toggle: off → first track, any track → off.
    if (current === -1) tracks[0].mode = 'showing';
    syncCc();
  };
  const onFsClick = (): void => {
    if (isFullscreen()) {
      void document.exitFullscreen?.();
    } else {
      void host.requestFullscreen?.();
    }
  };

  playBtn.addEventListener('click', onPlayClick);
  muteBtn.addEventListener('click', onMuteClick);
  volume.addEventListener('input', onVolumeInput);
  seek.addEventListener('pointerdown', onSeekStart);
  seek.addEventListener('input', onSeekInput);
  seek.addEventListener('change', onSeekCommit);
  speedBtn.addEventListener('click', onSpeedClick);
  ccBtn.addEventListener('click', onCcClick);
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
    document.removeEventListener('fullscreenchange', onFsChange);
    trackList.removeEventListener?.('addtrack', syncCc);
    trackList.removeEventListener?.('removetrack', syncCc);
    trackList.removeEventListener?.('change', syncCc);
    root.remove();
  };

  return { element: root, update, destroy };
}
