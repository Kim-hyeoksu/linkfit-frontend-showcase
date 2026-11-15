"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?:
    | ReactNode
    | ((props: { error: Error; reset: () => void }) => ReactNode);
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const initialState: ErrorBoundaryState = {
  hasError: false,
  error: null,
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = initialState;

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary caught an error]:", error, errorInfo);
    }
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { hasError } = this.state;
    const { resetKeys } = this.props;

    if (hasError && resetKeys && prevProps.resetKeys) {
      const isChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );
      if (isChanged) {
        this.reset();
      }
    }
  }

  public reset = () => {
    this.props.onReset?.();
    this.setState(initialState);
  };

  public render() {
    const { hasError, error } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      if (typeof fallback === "function") {
        return fallback({ error, reset: this.reset });
      }
      if (fallback) {
        return fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-red-50/50 rounded-2xl border border-red-100">
          <p className="text-sm font-bold text-red-600 mb-2">
            문제가 발생했습니다.
          </p>
          <p className="text-xs text-red-400 mb-4">{error.message}</p>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-red-600 rounded-lg shadow-sm border border-red-200 active:scale-95 transition-all"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return children;
  }
}
