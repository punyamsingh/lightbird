"use client";

import React from "react";
import { OpenFeatureProvider } from "@openfeature/react-sdk";
import { initFeatureFlags } from "@/lib/feature-flags";

// Initialise flags once at module load (synchronous — InMemoryProvider is ready immediately)
initFeatureFlags();

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  return <OpenFeatureProvider>{children}</OpenFeatureProvider>;
}
