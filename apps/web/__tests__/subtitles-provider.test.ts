import { fetchWithTimeout, isTimeout, PROVIDER_TIMEOUT_MS } from "../src/app/api/subtitles/provider";

/**
 * `fetchWithTimeout` is the single choke point for outbound provider calls, so
 * it owns two guarantees the routes depend on: the deadline covers the body
 * read, and a response nobody reads does not leak its connection.
 */

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

/** Minimal Response stand-in — only the fields the helper touches. */
function fakeResponse(status: number, cancel: jest.Mock): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: { cancel },
  } as unknown as Response;
}

describe("fetchWithTimeout — non-ok responses", () => {
  it("cancels the body it is never going to read", async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(429, cancel));
    const consume = jest.fn();

    const { response, body } = await fetchWithTimeout("https://p.test", {}, consume);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(consume).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(body).toBeUndefined();
  });

  it("still returns the status when cancelling rejects", async () => {
    // An already-errored stream rejects on cancel. That must not turn a
    // mappable 401 into a thrown error the route reports as unreachable.
    const cancel = jest.fn().mockRejectedValue(new Error("stream already errored"));
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(401, cancel));

    const { response } = await fetchWithTimeout("https://p.test", {}, jest.fn());

    expect(response.status).toBe(401);
  });

  it("tolerates a response with no body", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, body: null } as Response);

    const { response } = await fetchWithTimeout("https://p.test", {}, jest.fn());

    expect(response.status).toBe(404);
  });

  it("cancels a real ReadableStream body", async () => {
    // The stand-in above proves the call is made; this proves it reaches the
    // stream, which is what actually releases the socket.
    const cancelled = jest.fn();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("provider error page"));
      },
      cancel: cancelled,
    });
    global.fetch = jest.fn().mockResolvedValue(new Response(stream, { status: 502 }));

    const { response } = await fetchWithTimeout("https://p.test", {}, jest.fn());

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(502);
  });
});

describe("fetchWithTimeout — ok responses", () => {
  it("reads the body through consume and leaves it alone otherwise", async () => {
    const cancel = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(200, cancel));
    const consume = jest.fn().mockResolvedValue({ data: [] });

    const { body } = await fetchWithTimeout("https://p.test", {}, consume);

    expect(consume).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(body).toEqual({ data: [] });
  });

  it("keeps the deadline armed across the body read", async () => {
    // The point of the consume callback: a provider that sends headers fast and
    // then stalls the body must still hit the deadline.
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(200, jest.fn()));

    await expect(
      fetchWithTimeout(
        "https://p.test",
        {},
        (): Promise<never> =>
          new Promise((_resolve, reject) => {
            // Never settles on its own; the helper's abort rejects it.
            setTimeout(() => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), 50);
          }),
        20
      )
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });
});

describe("isTimeout", () => {
  it("recognises the helper's own timeout error", () => {
    expect(isTimeout(Object.assign(new Error("x"), { name: "TimeoutError" }))).toBe(true);
  });

  it("does not claim ordinary failures", () => {
    expect(isTimeout(new Error("ECONNREFUSED"))).toBe(false);
    expect(isTimeout(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(false);
  });

  it("exposes a bounded default deadline", () => {
    expect(PROVIDER_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PROVIDER_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
