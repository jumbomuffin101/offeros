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
  const dataRef = useRef<T | null>(null);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setError(null);
    devRepositoryResourceLog("error cleared", { operation: "refresh", requestId: currentRequest });
    try {
      const next = await loader();
      if (mounted.current && currentRequest === requestId.current) {
        dataRef.current = next;
        setData(next);
      }
    } catch (cause) {
      if (mounted.current && currentRequest === requestId.current && dataRef.current === null) {
        const nextError = toDataError(cause, "Unable to load workspace data.");
        devRepositoryResourceLog("error set", { operation: "refresh", requestId: currentRequest, code: nextError.code, message: nextError.message });
        setError(nextError);
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }, [loader]);

  const refreshSilently = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const next = await loader();
      if (mounted.current && currentRequest === requestId.current) {
        dataRef.current = next;
        setData(next);
        setError(null);
        devRepositoryResourceLog("error cleared", { operation: "silent-refresh", requestId: currentRequest });
      }
      return true;
    } catch {
      devRepositoryResourceLog("silent refresh failed", { requestId: currentRequest, hasData: dataRef.current !== null });
      return false;
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
    devRepositoryResourceLog("error cleared", { operation: "mutate", requestId: currentRequest });
    try {
      const result = await operation();
      try {
        const next = await loader();
        if (mounted.current && currentRequest === requestId.current) {
          dataRef.current = next;
          setData(next);
        }
      } catch {
        // Preserve the last successful UI state when a post-mutation background refresh times out.
      }
      announceDataChange();
      return result;
    } catch (cause) {
      const nextError = toDataError(cause, "Unable to update workspace data.");
      if (mounted.current && currentRequest === requestId.current) {
        devRepositoryResourceLog("error set", { operation: "mutate", requestId: currentRequest, code: nextError.code, message: nextError.message });
        setError(nextError);
      }
      throw nextError;
    }
  }, [loader]);

  const patchData = useCallback((updater: (current: T | null) => T | null) => {
    setData((current) => {
      const next = updater(current);
      dataRef.current = next;
      if (next !== null) {
        setError(null);
        devRepositoryResourceLog("error cleared", { operation: "patch-data" });
      }
      return next;
    });
  }, []);

  return { data, loading, error, refresh, refreshSilently, mutate, patchData };
}

function devRepositoryResourceLog(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[OfferOS Repository Resource]", message, details);
}
