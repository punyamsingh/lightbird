import { parseMediaError, validateFile } from "../src/utils/media-error";

// Helper to create a mock MediaError-like object
function makeMediaError(code: number, message = ""): MediaError {
  return { code, message, MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 } as unknown as MediaError;
}

describe("parseMediaError", () => {
  it("returns unknown error for null", () => {
    const result = parseMediaError(null);
    expect(result.type).toBe("unknown");
    expect(result.retryable).toBe(true);
    expect(result.recoverable).toBe(true);
  });

  it("handles MEDIA_ERR_ABORTED (code 1)", () => {
    const result = parseMediaError(makeMediaError(1));
    expect(result.type).toBe("aborted");
    expect(result.retryable).toBe(false);
    expect(result.recoverable).toBe(true);
  });

  it("handles MEDIA_ERR_NETWORK (code 2)", () => {
    const result = parseMediaError(makeMediaError(2));
    expect(result.type).toBe("network");
    expect(result.retryable).toBe(true);
    expect(result.recoverable).toBe(true);
  });

  it("handles MEDIA_ERR_DECODE (code 3)", () => {
    const result = parseMediaError(makeMediaError(3));
    expect(result.type).toBe("decode");
    expect(result.retryable).toBe(false);
    expect(result.recoverable).toBe(false);
  });

  it("handles MEDIA_ERR_SRC_NOT_SUPPORTED (code 4)", () => {
    const result = parseMediaError(makeMediaError(4));
    expect(result.type).toBe("unsupported");
    expect(result.retryable).toBe(false);
    expect(result.recoverable).toBe(false);
  });

  it("handles unknown code with error message", () => {
    const result = parseMediaError(makeMediaError(99, "weird error"));
    expect(result.type).toBe("unknown");
    expect(result.message).toBe("weird error");
    expect(result.retryable).toBe(true);
  });

  it("falls back to default message for unknown code without message", () => {
    const result = parseMediaError(makeMediaError(99, ""));
    expect(result.message).toBe("An unexpected error occurred.");
  });
});

describe("validateFile", () => {
  function makeFile(name: string, size: number): File {
    const file = new File([""], name, { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: size });
    return file;
  }

  it("accepts a valid small mp4", () => {
    const file = makeFile("video.mp4", 1024 * 1024);
    expect(validateFile(file).valid).toBe(true);
  });

  it("accepts all supported extensions", () => {
    const exts = ["mp4", "webm", "mkv", "mov", "avi", "wmv", "flv", "m4v", "ogv"];
    for (const ext of exts) {
      const file = makeFile(`video.${ext}`, 100);
      expect(validateFile(file).valid).toBe(true);
    }
  });

  it("rejects unsupported extension", () => {
    const file = makeFile("audio.mp3", 100);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("mp3");
  });

  it("rejects file with no extension", () => {
    const file = makeFile("videofile", 100);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
  });

  it("rejects file over 10 GB", () => {
    const tenGBPlus = 10 * 1024 * 1024 * 1024 + 1;
    const file = makeFile("huge.mp4", tenGBPlus);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("too large");
  });

  it("accepts file exactly at 10 GB limit", () => {
    const tenGB = 10 * 1024 * 1024 * 1024;
    const file = makeFile("large.mp4", tenGB);
    expect(validateFile(file).valid).toBe(true);
  });
});
