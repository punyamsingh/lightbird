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
    // then stalls the body must still hit the deadline. The stalled read is
    // settled only by the helper's own abort signal — on its own timer it would
    // pass even if fetchWithTimeout never called controller.abort().
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return Promise.resolve(fakeResponse(200, jest.fn()));
    }) as unknown as typeof fetch;

    await expect(
      fetchWithTimeout(
        "https://p.test",
        {},
        (): Promise<never> =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
            );
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

  it.each([
    ["https://169.254.169.254/latest/meta-data", "cloud metadata"],
    ["https://127.0.0.1/x", "loopback"],
    ["https://localhost/x", "localhost"],
    ["https://10.0.0.5/x", "private 10/8"],
    ["https://172.16.0.1/x", "private 172.16/12"],
    ["https://192.168.1.1/x", "private 192.168/16"],
    ["https://100.64.0.1/x", "carrier-grade NAT"],
    ["https://0.0.0.0/x", "unspecified"],
    ["https://[::1]/x", "IPv6 loopback"],
    ["https://[fd00::1]/x", "IPv6 unique-local"],
    ["https://[fe80::1]/x", "IPv6 link-local"],
  ])("rejects %s (%s) even over https", (raw) => {
    expect(parseHttpsUrl(raw)).toBeNull();
  });

  it.each([
    ["https://172.15.0.1/x", "just below the private 172 range"],
    ["https://172.32.0.1/x", "just above the private 172 range"],
    ["https://192.169.1.1/x", "adjacent to 192.168/16"],
    ["https://100.63.0.1/x", "just below CGNAT"],
    ["https://8.8.8.8/x", "public resolver"],
  ])("still accepts %s (%s)", (raw) => {
    expect(parseHttpsUrl(raw)).not.toBeNull();
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

  it("refuses a redirect to an internal address served over https", async () => {
    queueFetch([redirect(302, "https://169.254.169.254/latest/meta-data")]);

    await expect(
      fetchFollowingHttpsRedirects(new URL("https://cdn.example/sub.srt"), async () => "content")
    ).rejects.toBeInstanceOf(UnsafeDownloadLinkError);
  });

  it("spends one deadline across the whole chain, not one per hop", async () => {
    // Each hop consumes part of the budget, so a slow chain cannot hold the
    // route open for MAX_DOWNLOAD_REDIRECTS x the timeout.
    const timeouts: (number | undefined)[] = [];
    let clock = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => clock);

    global.fetch = jest.fn(() => {
      clock += 30; // every hop burns 30ms
      return Promise.resolve(redirect(302, "https://cdn.example/next"));
    }) as unknown as typeof fetch;

    // Capture the per-hop budget by wrapping the consume callback's caller.
    const original = global.setTimeout;
    jest.spyOn(global, "setTimeout").mockImplementation(((fn: () => void, ms?: number) => {
      timeouts.push(ms);
      return original(fn, 0);
    }) as unknown as typeof setTimeout);

    await expect(
      fetchFollowingHttpsRedirects(new URL("https://cdn.example/a"), async () => "x", 100)
    ).rejects.toMatchObject({ name: "TimeoutError" });

    // Strictly decreasing: 100, then 70, then 40, then 10 — never a fresh 100.
    expect(timeouts.length).toBeGreaterThan(1);
    expect(timeouts.every((ms, i) => i === 0 || (ms as number) < (timeouts[i - 1] as number))).toBe(
      true
    );
    jest.restoreAllMocks();
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
