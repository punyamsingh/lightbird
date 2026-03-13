"use client";

import { OpenFeature, InMemoryProvider } from "@openfeature/web-sdk";

/**
 * Feature flag keys — use these constants everywhere instead of raw strings.
 */
export const FLAG_MAGNET_LINK = "magnet-link-enabled";

/**
 * Initialise the OpenFeature SDK with an in-memory provider whose flag values
 * are driven by `NEXT_PUBLIC_` environment variables (inlined at build time by
 * Next.js). Call this once, as early as possible, before any `useFlag` hook runs.
 *
 * To enable the magnet-link feature set `NEXT_PUBLIC_FEATURE_MAGNET_LINK=true`
 * in your `.env.local` (or in your deployment environment) and rebuild.
 */
export function initFeatureFlags(): void {
  const magnetEnabled = process.env.NEXT_PUBLIC_FEATURE_MAGNET_LINK === "true";

  OpenFeature.setProvider(
    new InMemoryProvider({
      [FLAG_MAGNET_LINK]: {
        defaultVariant: magnetEnabled ? "on" : "off",
        variants: { on: true, off: false },
        disabled: false,
      },
    }),
  );
}
