declare module 'hls.js' {
  export default class Hls {
    static isSupported(): boolean;
    audioTracks: Array<{ id: number; name: string; lang?: string }>;
    levels: Array<{ height: number; bitrate: number; name?: string }>;
    audioTrack: number;
    currentLevel: number;

    constructor(config?: any);
    loadSource(url: string): void;
    attachMedia(videoElement: HTMLVideoElement): void;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
  }
}
