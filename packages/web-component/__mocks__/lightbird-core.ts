/**
 * Test double for `@lightbird/core`, wired in via `moduleNameMapper` in
 * `jest.config.ts`. The element only ever reaches core through a dynamic
 * `import('@lightbird/core')`, so this mock keeps the suite fast and free of
 * FFmpeg.wasm / hls.js without losing coverage of the core-routed paths.
 */

/** Audio tracks the next-created mock player will report. Set in a test. */
export let nextAudioTracks: { id: string; name: string; lang: string }[] = [];

/** Configure the audio tracks the next `createVideoPlayer()` will expose. */
export function __setNextAudioTracks(
  tracks: { id: string; name: string; lang: string }[],
): void {
  nextAudioTracks = tracks;
}

export class MockVideoPlayer {
  initializedWith: HTMLVideoElement | null = null;
  destroyed = false;
  tracksReady: Promise<void> = Promise.resolve();
  readonly switchAudioTrackCalls: string[] = [];
  private audioTracks: { id: string; name: string; lang: string }[];

  constructor(public readonly source: File | string) {
    this.audioTracks = nextAudioTracks;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<{ url: string }> {
    this.initializedWith = videoElement;
    if (typeof this.source === 'string') {
      videoElement.src = this.source;
    }
    return { url: typeof this.source === 'string' ? this.source : 'blob:mock-mkv' };
  }

  getAudioTracks(): { id: string; name: string; lang: string }[] {
    return this.audioTracks;
  }

  getSubtitles(): never[] {
    return [];
  }

  async switchAudioTrack(id: string): Promise<void> {
    this.switchAudioTrackCalls.push(id);
  }

  async switchSubtitle(): Promise<void> {}

  destroy(): void {
    this.destroyed = true;
  }
}

interface CreatedPlayerRecord {
  source: File | string;
  player: MockVideoPlayer;
}

/** Every player created via the mocked factory, in call order. */
export const createdPlayers: CreatedPlayerRecord[] = [];

/** Clears recorded calls — call from `beforeEach`. */
export function __resetCoreMock(): void {
  createdPlayers.length = 0;
  nextAudioTracks = [];
}

export function createVideoPlayer(source: File | string): MockVideoPlayer {
  const player = new MockVideoPlayer(source);
  createdPlayers.push({ source, player });
  return player;
}

export class SubtitleConverter {
  static async convertSrtToVtt(srtContent: string): Promise<string> {
    return `WEBVTT\n\n${srtContent}`;
  }
}
