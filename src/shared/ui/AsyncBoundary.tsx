"use client";

import React, { Suspense, ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";

export interface AsyncBoundaryProps extends Omit<ErrorBoundaryProps, "fallback"> {
  pendingFallback?: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  children: ReactNode;
}

export const AsyncBoundary = ({
  pendingFallback,
  fallback,
  errorFallback,
  children,
  resetKeys,
  onReset,
}: AsyncBoundaryProps) => {
  const loadingFallback = pendingFallback ?? fallback ?? null;

  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQuery }) => (
        <ErrorBoundary
          resetKeys={resetKeys}
          onReset={() => {
            resetQuery();
            onReset?.();
          }}
          fallback={errorFallback}
        >
          <Suspense fallback={loadingFallback}>
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
