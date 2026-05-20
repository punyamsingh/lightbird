"use client";

import React, { useEffect } from "react";
import { OpenFeatureProvider } from "@openfeature/react-sdk";
import { initFeatureFlags } from "@lightbird/core";

let started = false;

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  // Initialise on the client only. Running during SSR makes the server and
  // client provider states diverge, which breaks hydration (React error #418).
  useEffect(() => {
    if (started) return;
    started = true;
    initFeatureFlags().catch(console.error);
  }, []);

  // Never suspend: flags resolve to the default passed to each
  // useBooleanFlagValue call until the provider is ready, so SSR and the first
  // client render stay identical.
  return (
    <OpenFeatureProvider suspendUntilReady={false} suspendWhileReconciling={false}>
      {children}
    </OpenFeatureProvider>
  );
}
