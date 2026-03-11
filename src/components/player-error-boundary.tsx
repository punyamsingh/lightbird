"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class PlayerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[LightBird] Render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
          <p>
            Something went wrong with the player.{" "}
            <button
              className="underline hover:text-gray-300"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
