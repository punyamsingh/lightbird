"use client";

import { OpenFeature } from "@openfeature/web-sdk";
import { UnleashWebProvider } from "@openfeature/unleash-web-provider";

/**
 * Feature flag keys — use these constants everywhere instead of raw strings.
 */
export const FLAG_MAGNET_LINK = "magnet-link-enabled";

/**
 * Initialise the OpenFeature SDK with the Unleash Frontend API provider.
 * Returns a promise that resolves once Unleash has fetched the initial flag
 * state. Flags fall back to `false` while the provider is loading.
 *
 * Requires the following environment variables (set in .env.local or Vercel):
 *   NEXT_PUBLIC_UNLEASH_URL        — Frontend API URL
 *   NEXT_PUBLIC_UNLEASH_CLIENT_KEY — Frontend API token
 */
export function initFeatureFlags(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_UNLEASH_URL ?? "";
  const clientKey = process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY ?? "";

  return OpenFeature.setProvider(
    new UnleashWebProvider({ url, clientKey, appName: "lightbird" }),
  );
}
