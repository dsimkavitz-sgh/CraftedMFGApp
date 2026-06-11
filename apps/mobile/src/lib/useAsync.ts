import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./errors";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  /** True during a pull-to-refresh reload (data stays on screen). */
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Tiny data-fetching hook used by every screen.
 * Re-runs `fn` whenever `deps` change; ignores results from stale runs.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (mode: "initial" | "reload" | "refresh") => {
    const id = ++runId.current;
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fn();
      if (runId.current === id) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (runId.current === id) setError(errorMessage(e));
    } finally {
      if (runId.current === id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, deps);

  useEffect(() => {
    void run("initial");
  }, [run]);

  const reload = useCallback(() => run("reload"), [run]);
  const refresh = useCallback(() => run("refresh"), [run]);

  return { data, loading, refreshing, error, reload, refresh };
}
