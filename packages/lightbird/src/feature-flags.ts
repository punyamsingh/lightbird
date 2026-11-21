"use client";

import { OpenFeature } from "@openfeature/web-sdk";
import { UnleashWebProvider } from "@openfeature/unleash-web-provider";

/** Dedicated SDK domain: never replace a host application's default provider. */
export const LIGHTBIRD_FEATURE_DOMAIN = "lightbird";

/**
 * Feature flag keys — use these constants everywhere instead of raw strings.
 */
export const FLAG_MAGNET_LINK = "magnet-link-enabled";

/**
 * Initialise LightBird's named OpenFeature domain with the Unleash provider.
 * Returns a promise that resolves once Unleash has fetched the initial flag
 * state. Each `useBooleanFlagValue` call supplies its own default, used while
 * the provider is loading or when no provider is configured.
 *
 * The process.env expressions must be replaced by the bundler or backed by a
 * process global. Vite consumers must wire these public values explicitly.
 *
 * Requires the following environment variables (set in .env.local or Vercel):
 *   NEXT_PUBLIC_UNLEASH_URL        — Frontend API URL
 *   NEXT_PUBLIC_UNLEASH_CLIENT_KEY — Frontend API token
 */
export function initFeatureFlags(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_UNLEASH_URL ?? "";
  const clientKey = process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY ?? "";

  // Without valid Unleash credentials the provider cannot fetch flag state,
  // so every flag would silently fall back to its default. Skip provider
  // setup and warn loudly instead of failing quietly.
  if (!url || !clientKey) {
    console.warn(
      "[feature-flags] NEXT_PUBLIC_UNLEASH_URL and/or " +
        "NEXT_PUBLIC_UNLEASH_CLIENT_KEY are not set — feature flags will use " +
        "their default values (magnet link enabled by default).",
    );
    return Promise.resolve();
  }

  return OpenFeature.setProviderAndWait(
    LIGHTBIRD_FEATURE_DOMAIN,
    new UnleashWebProvider({ url, clientKey, appName: "lightbird" }),
  );
}
