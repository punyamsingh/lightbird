import {
  fetchWithTimeout,
  fetchFollowingHttpsRedirects,
  parseHttpsUrl,
  isTimeout,
  UnsafeDownloadLinkError,
  MAX_DOWNLOAD_REDIRECTS,
  PROVIDER_TIMEOUT_MS,
} from "../src/app/api/subtitles/provider";

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

describe("parseHttpsUrl", () => {
  it("accepts an https URL", () => {
    expect(parseHttpsUrl("https://cdn.example/sub.srt")?.host).toBe("cdn.example");
  });

  it.each([
    ["http://cdn.example/sub.srt", "plain http"],
    ["file:///etc/passwd", "file"],
    ["ftp://cdn.example/sub.srt", "ftp"],
    ["data:text/plain,hi", "data"],
    ["not a url", "unparseable"],
    ["", "empty"],
  ])("rejects %s (%s)", (raw) => {
    expect(parseHttpsUrl(raw)).toBeNull();
  });

  it("resolves a relative Location against the current hop", () => {
    const base = new URL("https://cdn.example/a/b");
    expect(parseHttpsUrl("../c/sub.srt", base)?.toString()).toBe("https://cdn.example/c/sub.srt");
  });

  it("rejects a relative Location that downgrades the scheme", () => {
    // A protocol-relative //host on an https base stays https, but an explicit
    // http:// Location must not be accepted just because a base was supplied.
    const base = new URL("https://cdn.example/a");
    expect(parseHttpsUrl("http://169.254.169.254/latest/meta-data", base)).toBeNull();
  });
});

describe("fetchFollowingHttpsRedirects", () => {
  /** Queues responses so each hop gets the next one. */
  function queueFetch(responses: Response[]) {
    const calls: string[] = [];
    global.fetch = jest.fn((url: string) => {
      calls.push(String(url));
      const next = responses.shift();
      if (!next) throw new Error("unexpected extra fetch");
      return Promise.resolve(next);
    }) as unknown as typeof fetch;
    return calls;
  }

  function redirect(status: number, location?: string): Response {
    const headers = new Headers();
    if (location) headers.set("location", location);
    return { ok: false, status, headers, body: null } as unknown as Response;
  }

  it("returns the first non-redirect response without following further", async () => {
    const calls = queueFetch([
      { ok: true, status: 200, headers: new Headers(), body: null } as unknown as Response,
    ]);

    const { response, body } = await fetchFollowingHttpsRedirects(
      new URL("https://cdn.example/sub.srt"),
      async () => "content"
    );

    expect(response.status).toBe(200);
    expect(body).toBe("content");
    expect(calls).toEqual(["https://cdn.example/sub.srt"]);
  });

  it("follows an https redirect and consumes the final response", async () => {
    const calls = queueFetch([
      redirect(302, "https://cdn2.example/real.srt"),
      { ok: true, status: 200, headers: new Headers(), body: null } as unknown as Response,
    ]);

    const { body } = await fetchFollowingHttpsRedirects(
      new URL("https://cdn.example/sub.srt"),
      async () => "content"
    );

    expect(body).toBe("content");
    expect(calls).toEqual(["https://cdn.example/sub.srt", "https://cdn2.example/real.srt"]);
  });

  it("refuses a redirect that leaves https", async () => {
    // The whole point of manual redirects: a valid https link can still try to
    // bounce the server at an internal address.
    queueFetch([redirect(302, "http://169.254.169.254/latest/meta-data")]);

    await expect(
      fetchFollowingHttpsRedirects(new URL("https://cdn.example/sub.srt"), async () => "content")
    ).rejects.toBeInstanceOf(UnsafeDownloadLinkError);
  });

  it("stops after the redirect limit rather than looping forever", async () => {
    queueFetch(
      Array.from({ length: MAX_DOWNLOAD_REDIRECTS }, (_, i) =>
        redirect(302, `https://cdn.example/hop${i + 1}`)
      )
    );

    await expect(
      fetchFollowingHttpsRedirects(new URL("https://cdn.example/hop0"), async () => "content")
    ).rejects.toBeInstanceOf(UnsafeDownloadLinkError);
  });

  it("hands back a malformed redirect that carries no Location", async () => {
    queueFetch([redirect(302)]);

    const { response } = await fetchFollowingHttpsRedirects(
      new URL("https://cdn.example/sub.srt"),
      async () => "content"
    );

    expect(response.status).toBe(302);
  });

  it("requests each hop with redirect: manual", async () => {
    queueFetch([
      { ok: true, status: 200, headers: new Headers(), body: null } as unknown as Response,
    ]);

    await fetchFollowingHttpsRedirects(new URL("https://cdn.example/sub.srt"), async () => "x");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://cdn.example/sub.srt",
      expect.objectContaining({ redirect: "manual" })
    );
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
