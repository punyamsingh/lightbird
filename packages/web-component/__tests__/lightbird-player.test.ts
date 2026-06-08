import { LightBirdPlayerElement, register } from '../src/index';
import {
  createdPlayers,
  __resetCoreMock,
  __setNextAudioTracks,
} from '../__mocks__/lightbird-core';

/** Drains the microtask queue so lazy `import()` chains settle. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

function mount(attributes: Record<string, string> = {}): LightBirdPlayerElement {
  const el = document.createElement('lightbird-player');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

beforeAll(() => {
  // jsdom leaves media playback unimplemented — stub the verbs the element calls.
  HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.load = jest.fn();
});

beforeEach(() => {
  __resetCoreMock();
  document.body.innerHTML = '';
});

describe('registration', () => {
  it('defines the <lightbird-player> custom element', () => {
    expect(customElements.get('lightbird-player')).toBe(LightBirdPlayerElement);
  });

  it('register() is idempotent', () => {
    expect(() => {
      register();
      register('lightbird-player');
    }).not.toThrow();
  });

  it('register() defines a fresh subclass for an alternate tag name', () => {
    expect(() => register('my-lightbird-player')).not.toThrow();
    const ctor = customElements.get('my-lightbird-player');
    expect(ctor).toBeDefined();
    // Spec forbids reusing the same constructor under two tag names, so the
    // alternate registration must be a distinct (sub)class.
    expect(ctor).not.toBe(LightBirdPlayerElement);
  });
});

describe('shadow DOM', () => {
  it('renders a <video> element inside an open shadow root', () => {
    const el = mount();
    expect(el.shadowRoot).not.toBeNull();
    const video = el.shadowRoot!.querySelector('video');
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(video!.getAttribute('part')).toBe('video');
    expect(el.mediaElement).toBe(video);
  });
});

describe('media attributes', () => {
  it('reflects autoplay / muted / poster onto the internal video', () => {
    const el = mount({
      autoplay: '',
      muted: '',
      poster: 'cover.jpg',
    });
    const video = el.mediaElement;
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.poster).toContain('cover.jpg');
  });

  it('uses the styled bar for `controls` and keeps native video controls off', () => {
    const el = mount({ controls: '' });
    // The styled bar is mounted; the native <video> controls stay disabled.
    expect(el.mediaElement.controls).toBe(false);
    expect(el.shadowRoot!.querySelector('.lb-controls')).not.toBeNull();
  });

  it('uses native video controls when `nativecontrols` is also set', () => {
    const el = mount({ controls: '', nativecontrols: '' });
    expect(el.mediaElement.controls).toBe(true);
    expect(el.shadowRoot!.querySelector('.lb-controls')).toBeNull();
  });

  it('keeps the muted property in sync with the internal video', () => {
    const el = mount();
    el.muted = true;
    expect(el.muted).toBe(true);
    expect(el.mediaElement.muted).toBe(true);
    expect(el.hasAttribute('muted')).toBe(true);
  });
});

describe('styled control bar', () => {
  it('is absent until controls are enabled', () => {
    const el = mount();
    expect(el.shadowRoot!.querySelector('.lb-controls')).toBeNull();
  });

  it('mounts when `controls` is toggled on after connection', () => {
    const el = mount();
    el.controls = true;
    expect(el.shadowRoot!.querySelector('.lb-controls')).not.toBeNull();
  });

  it('unmounts when `controls` is toggled back off', () => {
    const el = mount({ controls: '' });
    expect(el.shadowRoot!.querySelector('.lb-controls')).not.toBeNull();
    el.controls = false;
    expect(el.shadowRoot!.querySelector('.lb-controls')).toBeNull();
  });

  it('swaps to native controls when `nativecontrols` is toggled on', () => {
    const el = mount({ controls: '' });
    expect(el.shadowRoot!.querySelector('.lb-controls')).not.toBeNull();
    el.nativeControls = true;
    expect(el.shadowRoot!.querySelector('.lb-controls')).toBeNull();
    expect(el.mediaElement.controls).toBe(true);
  });

  it('renders play, mute, seek, settings and fullscreen affordances', () => {
    const el = mount({ controls: '' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.lb-play')).not.toBeNull();
    expect(root.querySelector('.lb-mute')).not.toBeNull();
    expect(root.querySelector('.lb-seek')).not.toBeNull();
    expect(root.querySelector('.lb-settings')).not.toBeNull();
    expect(root.querySelector('.lb-fs')).not.toBeNull();
  });

  it('toggles play/pause when the play button is clicked', () => {
    const el = mount({ controls: '' });
    const playBtn = el.shadowRoot!.querySelector('.lb-play') as HTMLButtonElement;
    playBtn.click();
    expect(el.mediaElement.play).toHaveBeenCalled();
  });

  it('hides the CC toggle when the media has no text tracks', () => {
    // jsdom does not populate video.textTracks from appended <track> elements,
    // so we can only assert the no-tracks case here; the visible path is
    // exercised in real browsers where textTracks reflects the DOM.
    const el = mount({ controls: '' });
    const cc = el.shadowRoot!.querySelector('.lb-cc') as HTMLButtonElement;
    expect(cc.hidden).toBe(true);
  });

  it('removes the bar and its listeners on disconnect', () => {
    const el = mount({ controls: '' });
    expect(el.shadowRoot!.querySelector('.lb-controls')).not.toBeNull();
    el.remove();
    expect(el.shadowRoot!.querySelector('.lb-controls')).toBeNull();
  });
});

describe('control bar — settings menu', () => {
  it('is closed until the settings button is clicked', () => {
    const el = mount({ controls: '' });
    const menu = el.shadowRoot!.querySelector('.lb-settings-menu') as HTMLElement;
    expect(menu.dataset.open).not.toBe('1');
    (el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement).click();
    expect(menu.dataset.open).toBe('1');
  });

  it('offers playback-speed presets and applies them', () => {
    const el = mount({ controls: '' });
    (el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement).click();
    const items = el.shadowRoot!.querySelectorAll('.lb-settings-menu .lb-menu-item[data-speed]');
    expect(items.length).toBeGreaterThanOrEqual(5);
    const twoX = Array.from(items).find(
      (i) => (i as HTMLElement).dataset.speed === '2',
    ) as HTMLButtonElement;
    twoX.click();
    expect(el.mediaElement.playbackRate).toBe(2);
    expect(twoX.classList.contains('lb-checked')).toBe(true);
  });

  it('applies a CSS filter when a display slider changes', () => {
    const el = mount({ controls: '' });
    (el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement).click();
    const brightness = el.shadowRoot!.querySelector(
      '.lb-settings-menu .lb-filter input',
    ) as HTMLInputElement;
    brightness.value = '150';
    brightness.dispatchEvent(new Event('input'));
    expect(el.mediaElement.style.filter).toContain('brightness(150%)');
  });

  it('resets display filters', () => {
    const el = mount({ controls: '' });
    (el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement).click();
    const brightness = el.shadowRoot!.querySelector(
      '.lb-settings-menu .lb-filter input',
    ) as HTMLInputElement;
    brightness.value = '40';
    brightness.dispatchEvent(new Event('input'));
    expect(el.mediaElement.style.filter).toContain('brightness(40%)');
    (el.shadowRoot!.querySelector('.lb-settings-menu .lb-reset') as HTMLButtonElement).click();
    expect(el.mediaElement.style.filter).toContain('brightness(100%)');
  });

  it('keeps the bar pinned open while a menu is open', () => {
    const el = mount({ controls: '' });
    const controls = el.shadowRoot!.querySelector('.lb-controls') as HTMLElement;
    (el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement).click();
    expect(controls.dataset.show).toBe('1');
  });

  it('advertises menu semantics and toggles aria-expanded on the trigger', () => {
    const el = mount({ controls: '' });
    const settingsBtn = el.shadowRoot!.querySelector('.lb-settings') as HTMLButtonElement;
    expect(settingsBtn.getAttribute('aria-haspopup')).toBe('menu');
    expect(settingsBtn.getAttribute('aria-expanded')).toBe('false');
    settingsBtn.click();
    expect(settingsBtn.getAttribute('aria-expanded')).toBe('true');
    settingsBtn.click();
    expect(settingsBtn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('control bar — feature allow-list', () => {
  it('renders every feature for a bare `controls` attribute', () => {
    const el = mount({ controls: '' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.lb-play')).not.toBeNull();
    expect(root.querySelector('.lb-seek')).not.toBeNull();
    expect(root.querySelector('.lb-mute')).not.toBeNull();
    expect(root.querySelector('.lb-settings')).not.toBeNull();
    expect(root.querySelector('.lb-fs')).not.toBeNull();
  });

  it('renders only the allow-listed features', () => {
    const el = mount({ controls: 'play seek fullscreen' });
    const root = el.shadowRoot!;
    expect(root.querySelector('.lb-play')).not.toBeNull();
    expect(root.querySelector('.lb-seek')).not.toBeNull();
    expect(root.querySelector('.lb-fs')).not.toBeNull();
    // Excluded affordances are not in the DOM at all.
    expect(root.querySelector('.lb-mute')).toBeNull();
    expect(root.querySelector('.lb-settings')).toBeNull();
    expect(root.querySelector('.lb-volume')).toBeNull();
  });

  it('falls back to all features when the allow-list matches nothing valid', () => {
    const el = mount({ controls: 'bogus nonsense' });
    expect(el.shadowRoot!.querySelector('.lb-settings')).not.toBeNull();
  });

  it('keeps a disabled audio feature hidden even for multi-track sources', async () => {
    __setNextAudioTracks([
      { id: '0', name: 'English', lang: 'en' },
      { id: '1', name: 'Japanese', lang: 'ja' },
    ]);
    const el = mount({ controls: 'play seek fullscreen', src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    await flush();
    expect(el.shadowRoot!.querySelector('.lb-audio')).toBeNull();
  });

  it('rebuilds the bar when the allow-list changes', () => {
    const el = mount({ controls: 'play' });
    expect(el.shadowRoot!.querySelector('.lb-fs')).toBeNull();
    el.setAttribute('controls', 'play fullscreen');
    expect(el.shadowRoot!.querySelector('.lb-fs')).not.toBeNull();
  });
});

describe('control bar — playlist', () => {
  const TWO = JSON.stringify([
    { src: 'a.mp4', title: 'First' },
    { src: 'b.mp4', title: 'Second' },
  ]);

  it('shows no playlist affordances for a single entry', () => {
    const el = mount({ controls: '', sources: JSON.stringify([{ src: 'a.mp4' }]) });
    expect((el.shadowRoot!.querySelector('.lb-playlist') as HTMLButtonElement).hidden).toBe(true);
    expect((el.shadowRoot!.querySelector('.lb-prev') as HTMLButtonElement).hidden).toBe(true);
  });

  it('loads the first entry and exposes prev/next + a menu for 2+ entries', () => {
    const el = mount({ controls: '', sources: TWO });
    expect(el.mediaElement.src).toContain('a.mp4');
    const playlistBtn = el.shadowRoot!.querySelector('.lb-playlist') as HTMLButtonElement;
    expect(playlistBtn.hidden).toBe(false);
    playlistBtn.click();
    const items = el.shadowRoot!.querySelectorAll('.lb-playlist-menu .lb-menu-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('First');
  });

  it('disables Previous on the first entry and Next on the last', () => {
    const el = mount({ controls: '', sources: TWO });
    const prev = el.shadowRoot!.querySelector('.lb-prev') as HTMLButtonElement;
    const next = el.shadowRoot!.querySelector('.lb-next') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    next.click();
    expect(el.mediaElement.src).toContain('b.mp4');
    expect((el.shadowRoot!.querySelector('.lb-next') as HTMLButtonElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('.lb-prev') as HTMLButtonElement).disabled).toBe(false);
  });

  it('selecting a playlist item loads that source', () => {
    const el = mount({ controls: '', sources: TWO });
    (el.shadowRoot!.querySelector('.lb-playlist') as HTMLButtonElement).click();
    const items = el.shadowRoot!.querySelectorAll('.lb-playlist-menu .lb-menu-item');
    (items[1] as HTMLButtonElement).click();
    expect(el.mediaElement.src).toContain('b.mp4');
  });

  it('auto-advances to the next entry when the current one ends', () => {
    const el = mount({ controls: '', sources: TWO });
    expect(el.mediaElement.src).toContain('a.mp4');
    el.mediaElement.dispatchEvent(new Event('ended'));
    expect(el.mediaElement.src).toContain('b.mp4');
  });

  it('hides playlist affordances when the feature is not allow-listed', () => {
    const el = mount({ controls: 'play seek fullscreen', sources: TWO });
    expect(el.shadowRoot!.querySelector('.lb-playlist')).toBeNull();
    // First entry still loads — playback is independent of the UI affordance.
    expect(el.mediaElement.src).toContain('a.mp4');
  });

  it('keeps the active entry poster after an unrelated attribute sync', () => {
    const sources = JSON.stringify([
      { src: 'a.mp4', title: 'First', poster: 'a.jpg' },
      { src: 'b.mp4', title: 'Second', poster: 'b.jpg' },
    ]);
    const el = mount({ controls: '', sources });
    expect(el.mediaElement.poster).toContain('a.jpg');
    // Toggling an unrelated attribute triggers syncMediaAttributes.
    el.muted = true;
    expect(el.mediaElement.poster).toContain('a.jpg');
  });
});

describe('control bar — picture-in-picture', () => {
  it('hides the PiP button when the API is unavailable', () => {
    // jsdom does not implement the PiP API, so the button stays hidden.
    const el = mount({ controls: '' });
    const pip = el.shadowRoot!.querySelector('.lb-pip') as HTMLButtonElement;
    expect(pip.hidden).toBe(true);
  });

  it('shows and wires the PiP button when the API is present', () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      configurable: true,
    });
    const requestPip = jest.fn().mockResolvedValue(undefined);
    (HTMLVideoElement.prototype as unknown as { requestPictureInPicture: unknown })
      .requestPictureInPicture = requestPip;

    try {
      const el = mount({ controls: '' });
      const pip = el.shadowRoot!.querySelector('.lb-pip') as HTMLButtonElement;
      expect(pip.hidden).toBe(false);
      pip.click();
      expect(requestPip).toHaveBeenCalled();
    } finally {
      delete (HTMLVideoElement.prototype as unknown as { requestPictureInPicture?: unknown })
        .requestPictureInPicture;
      Object.defineProperty(document, 'pictureInPictureEnabled', {
        value: false,
        configurable: true,
      });
    }
  });
});

describe('control bar — audio tracks', () => {
  it('shows no audio button for a single-track source', async () => {
    __setNextAudioTracks([{ id: '0', name: 'Default', lang: 'en' }]);
    const el = mount({ controls: '', src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    await flush();
    const audioBtn = el.shadowRoot!.querySelector('.lb-audio') as HTMLButtonElement;
    expect(audioBtn.hidden).toBe(true);
  });

  it('exposes an audio picker for a multi-track source', async () => {
    __setNextAudioTracks([
      { id: '0', name: 'English', lang: 'en' },
      { id: '1', name: 'Japanese', lang: 'ja' },
    ]);
    const el = mount({ controls: '', src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    await flush();

    const audioBtn = el.shadowRoot!.querySelector('.lb-audio') as HTMLButtonElement;
    expect(audioBtn.hidden).toBe(false);

    audioBtn.click();
    const items = el.shadowRoot!.querySelectorAll('.lb-audio-menu .lb-menu-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('English');
    expect(items[1].textContent).toBe('Japanese');
  });

  it('switches the core player audio track on selection', async () => {
    __setNextAudioTracks([
      { id: '0', name: 'English', lang: 'en' },
      { id: '1', name: 'Japanese', lang: 'ja' },
    ]);
    const el = mount({ controls: '', src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    await flush();

    (el.shadowRoot!.querySelector('.lb-audio') as HTMLButtonElement).click();
    const items = el.shadowRoot!.querySelectorAll('.lb-audio-menu .lb-menu-item');
    (items[1] as HTMLButtonElement).click();

    expect(createdPlayers[0].player.switchAudioTrackCalls).toContain('1');

    // Selecting rebuilds the menu, so re-query to read the new checked state.
    (el.shadowRoot!.querySelector('.lb-audio') as HTMLButtonElement).click();
    const refreshed = el.shadowRoot!.querySelectorAll('.lb-audio-menu .lb-menu-item');
    expect(refreshed[1].classList.contains('lb-checked')).toBe(true);
  });

  it('keeps the audio button hidden for native (non-core) sources', async () => {
    const el = mount({ controls: '', src: 'movie.mp4' });
    await flush();
    const audioBtn = el.shadowRoot!.querySelector('.lb-audio') as HTMLButtonElement;
    expect(audioBtn.hidden).toBe(true);
  });
});

describe('native source playback', () => {
  it('sets the video src directly for an MP4 and never loads core', async () => {
    const el = mount({ src: 'movie.mp4' });
    await flush();
    expect(el.mediaElement.src).toContain('movie.mp4');
    expect(createdPlayers).toHaveLength(0);
  });

  it('reloads when the src attribute changes', async () => {
    const el = mount({ src: 'first.mp4' });
    await flush();
    expect(el.mediaElement.src).toContain('first.mp4');
    el.src = 'second.webm';
    await flush();
    expect(el.mediaElement.src).toContain('second.webm');
    expect(createdPlayers).toHaveLength(0);
  });
});

describe('event forwarding', () => {
  it('re-dispatches native media events as CustomEvents with a detail snapshot', () => {
    const el = mount();
    const received: CustomEvent[] = [];
    el.addEventListener('play', (e) => received.push(e as CustomEvent));
    el.addEventListener('timeupdate', (e) => received.push(e as CustomEvent));

    el.mediaElement.dispatchEvent(new Event('play'));
    el.mediaElement.dispatchEvent(new Event('timeupdate'));

    expect(received.map((e) => e.type)).toEqual(['play', 'timeupdate']);
    expect(received[0].detail).toMatchObject({
      paused: expect.any(Boolean),
      volume: expect.any(Number),
      muted: expect.any(Boolean),
      playbackRate: expect.any(Number),
    });
  });

  it('stops forwarding events once disconnected', () => {
    const el = mount();
    const handler = jest.fn();
    el.addEventListener('pause', handler);
    el.remove();
    el.mediaElement.dispatchEvent(new Event('pause'));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('playback control', () => {
  it('delegates play() and pause() to the internal video', async () => {
    const el = mount();
    await el.play();
    el.pause();
    expect(el.mediaElement.play).toHaveBeenCalled();
    expect(el.mediaElement.pause).toHaveBeenCalled();
  });

  it('proxies volume and playbackRate to the internal video', () => {
    const el = mount();
    el.volume = 0.5;
    el.playbackRate = 1.5;
    expect(el.mediaElement.volume).toBe(0.5);
    expect(el.mediaElement.playbackRate).toBe(1.5);
  });
});

describe('subtitles', () => {
  it('renders <track> elements from the subtitles property', () => {
    const el = mount();
    el.subtitles = [
      { src: 'en.vtt', label: 'English', srclang: 'en', default: true },
      { src: 'es.vtt', label: 'Spanish', srclang: 'es' },
    ];
    const tracks = el.mediaElement.querySelectorAll('track[data-lightbird]');
    expect(tracks).toHaveLength(2);
    expect(tracks[0].getAttribute('src')).toBe('en.vtt');
    expect(tracks[0].getAttribute('label')).toBe('English');
    expect(tracks[0].getAttribute('srclang')).toBe('en');
    expect(tracks[0].hasAttribute('default')).toBe(true);
    expect(tracks[1].hasAttribute('default')).toBe(false);
  });

  it('renders <track> elements from the subtitles JSON attribute', () => {
    const el = mount({
      subtitles: JSON.stringify([{ src: 'fr.vtt', label: 'French', srclang: 'fr' }]),
    });
    const tracks = el.mediaElement.querySelectorAll('track[data-lightbird]');
    expect(tracks).toHaveLength(1);
    expect(tracks[0].getAttribute('src')).toBe('fr.vtt');
  });

  it('ignores a malformed subtitles attribute', () => {
    const el = mount({ subtitles: 'not json' });
    expect(el.mediaElement.querySelectorAll('track[data-lightbird]')).toHaveLength(0);
    expect(el.subtitles).toEqual([]);
  });

  it('emits an error event when an SRT subtitle fetch returns a non-2xx response', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'oops',
    });
    const el = mount();
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    el.subtitles = [{ src: 'broken.srt', label: 'English', srclang: 'en' }];
    await flush();
    await flush();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].detail.error).toContain('500');
  });
});

describe('core-routed sources', () => {
  it('lazy-loads core and creates a player for an HLS .m3u8 url', async () => {
    const el = mount({ src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    expect(createdPlayers).toHaveLength(1);
    expect(createdPlayers[0].source).toBe('https://cdn.example.com/stream.m3u8');
    expect(createdPlayers[0].player.initializedWith).toBe(el.mediaElement);
  });

  it('fetches an MKV url into a File before creating a core player', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['mkv-bytes'], { type: 'video/x-matroska' }),
    });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    const el = mount({ src: 'https://cdn.example.com/movie.mkv' });
    await flush();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/movie.mkv');
    expect(createdPlayers).toHaveLength(1);
    const { source } = createdPlayers[0];
    expect(source).toBeInstanceOf(File);
    expect((source as File).name).toBe('movie.mkv');
    expect(el).toBeDefined();
  });

  it('destroys the core player when the element is disconnected', async () => {
    const el = mount({ src: 'https://cdn.example.com/stream.m3u8' });
    await flush();
    expect(createdPlayers).toHaveLength(1);
    el.remove();
    expect(createdPlayers[0].player.destroyed).toBe(true);
  });

  it('emits an error event when an MKV fetch fails', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 });

    const el = mount();
    const errors: CustomEvent[] = [];
    el.addEventListener('error', (e) => errors.push(e as CustomEvent));
    el.src = 'https://cdn.example.com/missing.mkv';
    await flush();
    await flush();

    expect(errors).toHaveLength(1);
    expect(errors[0].detail.error).toContain('404');
  });
});
