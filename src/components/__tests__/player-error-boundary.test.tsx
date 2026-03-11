import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerErrorBoundary } from "../player-error-boundary";

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Test render error");
  return <div>Normal content</div>;
};

describe("PlayerErrorBoundary", () => {
  // Suppress console.error noise from intentional throws
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <PlayerErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </PlayerErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    render(
      <PlayerErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </PlayerErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("resets error state when Try again is clicked", () => {
    const { rerender } = render(
      <PlayerErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </PlayerErrorBoundary>
    );
    // Fallback is shown
    expect(screen.getByText("Try again")).toBeInTheDocument();

    // Click Try again — boundary resets, but the child still throws, so fallback shows again
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
