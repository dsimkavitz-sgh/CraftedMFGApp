"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList, Dispatch, SetStateAction } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the async function (keeps current data while reloading). */
  reload: () => void;
  /** Optimistic local updates. */
  setData: Dispatch<SetStateAction<T | null>>;
}

/** Best-effort human-readable message from an unknown thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return "Something went wrong";
}

/**
 * Minimal load-on-mount + refetch hook. Re-runs whenever `deps` change or
 * `reload()` is called. Ignores results from stale invocations.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef.current().then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload, setData };
}

/** Debounces a fast-changing value (e.g. search input) for use in useAsync deps. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
