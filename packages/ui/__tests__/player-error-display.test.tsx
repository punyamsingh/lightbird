import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerErrorDisplay } from "../src/player-error-display";
import type { ParsedMediaError } from "@lightbird/core";

const networkError: ParsedMediaError = {
  type: "network",
  message: "A network error interrupted loading. Check your connection.",
  recoverable: true,
  retryable: true,
};

const decodeError: ParsedMediaError = {
  type: "decode",
  message: "The video could not be decoded. It may be corrupted.",
  recoverable: false,
  retryable: false,
};

describe("PlayerErrorDisplay", () => {
  it("renders the error message", () => {
    render(<PlayerErrorDisplay error={networkError} />);
    expect(screen.getByText(networkError.message)).toBeInTheDocument();
    expect(screen.getByText("Playback Error")).toBeInTheDocument();
  });

  it("shows Retry button for retryable errors when onRetry provided", () => {
    const onRetry = jest.fn();
    render(<PlayerErrorDisplay error={networkError} onRetry={onRetry} />);
    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show Retry button for non-retryable errors", () => {
    render(<PlayerErrorDisplay error={decodeError} onRetry={jest.fn()} />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("shows Skip to Next button and calls onSkip", () => {
    const onSkip = jest.fn();
    render(<PlayerErrorDisplay error={decodeError} onSkip={onSkip} />);
    const skipBtn = screen.getByText("Skip to Next");
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("shows Dismiss button and calls onDismiss", () => {
    const onDismiss = jest.fn();
    render(<PlayerErrorDisplay error={decodeError} onDismiss={onDismiss} />);
    const dismissBtn = screen.getByText("Dismiss");
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render optional buttons when callbacks are not provided", () => {
    render(<PlayerErrorDisplay error={networkError} />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
    expect(screen.queryByText("Skip to Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });
});
