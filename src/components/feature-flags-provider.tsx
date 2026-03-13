"use client";

import React, { Suspense } from "react";
import { OpenFeatureProvider } from "@openfeature/react-sdk";
import { initFeatureFlags } from "@/lib/feature-flags";

// Kick off Unleash initialisation as early as possible.
// Flags return their default values until the first fetch completes.
initFeatureFlags().catch(console.error);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OpenFeatureProvider>{children}</OpenFeatureProvider>
    </Suspense>
  );
}
