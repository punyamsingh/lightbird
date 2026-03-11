"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedMediaError } from "@/lib/media-error";

interface Props {
  error: ParsedMediaError;
  onRetry?: () => void;
  onSkip?: () => void;
  onDismiss?: () => void;
}

export function PlayerErrorDisplay({ error, onRetry, onSkip, onDismiss }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-white text-lg font-semibold mb-2">Playback Error</h3>
      <p className="text-gray-300 text-sm text-center max-w-xs mb-6">{error.message}</p>
      <div className="flex gap-3">
        {error.retryable && onRetry && (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
        {onSkip && (
          <Button onClick={onSkip} variant="outline">
            Skip to Next
          </Button>
        )}
        {onDismiss && <Button onClick={onDismiss}>Dismiss</Button>}
      </div>
    </div>
  );
}
