// Mock worker creation to avoid import.meta.url in test environment
export function createFFmpegWorker() {
  return {
    postMessage: jest.fn(),
    onmessage: null,
    onerror: null,
    terminate: jest.fn(),
  };
}
