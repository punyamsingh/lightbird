const setProviderAndWait = jest.fn().mockResolvedValue(undefined);
const unleashCtor = jest.fn();

jest.mock("@openfeature/web-sdk", () => ({
  OpenFeature: { setProviderAndWait: (...args: unknown[]) => setProviderAndWait(...args) },
}));

jest.mock("@openfeature/unleash-web-provider", () => ({
  UnleashWebProvider: class {
    constructor(opts: unknown) {
      unleashCtor(opts);
    }
  },
}));

import { FLAG_MAGNET_LINK, initFeatureFlags } from "../src/feature-flags";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("FLAG_MAGNET_LINK", () => {
  it("is the stable flag key used across the codebase", () => {
    expect(FLAG_MAGNET_LINK).toBe("magnet-link-enabled");
  });
});

describe("initFeatureFlags", () => {
  it("registers the Unleash provider when both env vars are set", async () => {
    process.env.NEXT_PUBLIC_UNLEASH_URL = "https://unleash.example.com/api/frontend";
    process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY = "frontend-token";

    await initFeatureFlags();

    expect(unleashCtor).toHaveBeenCalledWith({
      url: "https://unleash.example.com/api/frontend",
      clientKey: "frontend-token",
      appName: "lightbird",
    });
    expect(setProviderAndWait).toHaveBeenCalledTimes(1);
  });

  it("warns and skips provider setup when the URL is missing", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY = "frontend-token";
    delete process.env.NEXT_PUBLIC_UNLEASH_URL;

    await expect(initFeatureFlags()).resolves.toBeUndefined();

    expect(setProviderAndWait).not.toHaveBeenCalled();
    expect(unleashCtor).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns and skips provider setup when the client key is missing", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_UNLEASH_URL = "https://unleash.example.com/api/frontend";
    delete process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY;

    await initFeatureFlags();

    expect(setProviderAndWait).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
