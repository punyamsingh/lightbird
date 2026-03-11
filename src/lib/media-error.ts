export type MediaErrorType = 'aborted' | 'network' | 'decode' | 'unsupported' | 'unknown';

export interface ParsedMediaError {
  type: MediaErrorType;
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

// Numeric constants matching HTMLMediaElement.error codes (avoids relying on MediaError global)
const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

export function parseMediaError(error: MediaError | null): ParsedMediaError {
  if (!error) {
    return { type: 'unknown', message: 'An unknown error occurred.', recoverable: true, retryable: true };
  }

  switch (error.code) {
    case MEDIA_ERR_ABORTED:
      return { type: 'aborted', message: 'Playback was aborted.', recoverable: true, retryable: false };
    case MEDIA_ERR_NETWORK:
      return { type: 'network', message: 'A network error interrupted loading. Check your connection.', recoverable: true, retryable: true };
    case MEDIA_ERR_DECODE:
      return { type: 'decode', message: 'The video could not be decoded. It may be corrupted.', recoverable: false, retryable: false };
    case MEDIA_ERR_SRC_NOT_SUPPORTED:
      return { type: 'unsupported', message: 'This format is not supported by your browser.', recoverable: false, retryable: false };
    default:
      return { type: 'unknown', message: error.message || 'An unexpected error occurred.', recoverable: true, retryable: true };
  }
}

export function validateFile(file: File): { valid: boolean; reason?: string } {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  const SUPPORTED = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'ogv'];

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      reason: `File is too large (${(file.size / 1e9).toFixed(1)} GB). Maximum is 10 GB.`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !SUPPORTED.includes(ext)) {
    return { valid: false, reason: `"${ext}" is not a supported video format.` };
  }

  return { valid: true };
}
