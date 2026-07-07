"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataError } from "@/lib/data/errors";
import { toDataError } from "@/lib/data/errors";
import { announceDataChange, OFFEROS_DATA_CHANGED_EVENT } from "@/lib/data/repositories/events";

export function useRepositoryResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DataError | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setError(null);
    try {
      const next = await loader();
      if (mounted.current && currentRequest === requestId.current) setData(next);
    } catch (cause) {
      if (mounted.current && currentRequest === requestId.current) setError(toDataError(cause, "Unable to load workspace data."));
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    mounted.current = true;
    window.queueMicrotask(() => void refresh());
    let refreshTimer: number | null = null;
    const handleRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refresh(), 80);
    };
    window.addEventListener("storage", handleRefresh);
    window.addEventListener(OFFEROS_DATA_CHANGED_EVENT, handleRefresh);
    return () => {
      mounted.current = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener(OFFEROS_DATA_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  const mutate = useCallback(async <TResult,>(operation: () => Promise<TResult>) => {
    const currentRequest = ++requestId.current;
    setError(null);
    try {
      const result = await operation();
      const next = await loader();
      if (mounted.current && currentRequest === requestId.current) setData(next);
      announceDataChange();
      return result;
    } catch (cause) {
      const nextError = toDataError(cause, "Unable to update workspace data.");
      if (mounted.current && currentRequest === requestId.current) setError(nextError);
      throw nextError;
    }
  }, [loader]);

  return { data, loading, error, refresh, mutate };
}
