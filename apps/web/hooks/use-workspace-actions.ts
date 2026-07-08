"use client";

import { useCallback, useState } from "react";
import type { DataError } from "@/lib/data/errors";
import { toDataError } from "@/lib/data/errors";
import { dataMode, workspaceRepository } from "@/lib/data/repositories/repositoryFactory";
import type { LocalImportStatus, WorkspaceResetMode, WorkspaceScope } from "@/lib/data/types/repositories";
import { announceDataChange } from "@/lib/data/repositories/events";

export function useWorkspaceActions() {
  const [error, setError] = useState<DataError | null>(null);
  const [localImportStatus, setLocalImportStatus] = useState<LocalImportStatus | null>(null);
  const [running, setRunning] = useState(false);
  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setError(null);
    setRunning(true);
    try { const result = await operation(); announceDataChange(); return result ?? true; }
    catch (cause) { setError(toDataError(cause, "Unable to update the workspace.")); return null; }
    finally { setRunning(false); }
  }, []);
  const reset = useCallback((scope: WorkspaceScope, mode: WorkspaceResetMode) => run(() => workspaceRepository.reset(scope, mode)), [run]);
  const populateDemo = useCallback(() => reset("all", "demo"), [reset]);
  const clearWorkspace = useCallback(() => dataMode === "api" ? reset("all", "empty") : run(() => workspaceRepository.clearWorkspace()), [reset, run]);
  const clear = useCallback((scope: WorkspaceScope) => dataMode === "api" ? reset(scope, "demo") : run(() => workspaceRepository.clear(scope)), [reset, run]);
  const checkLocalImport = useCallback(async () => {
    try {
      const status = await workspaceRepository.getLocalImportStatus();
      setLocalImportStatus(status);
      return status;
    } catch (cause) {
      setError(toDataError(cause, "Unable to inspect local workspace data."));
      return null;
    }
  }, []);
  const importLocalWorkspace = useCallback(async () => {
    setError(null);
    try {
      const status = await workspaceRepository.importLocalWorkspace();
      setLocalImportStatus({ ...status, available: false });
      announceDataChange();
      return status;
    } catch (cause) {
      setError(toDataError(cause, "Unable to import local workspace data."));
      return null;
    }
  }, []);
  return { reset, populateDemo, clearWorkspace, clear, checkLocalImport, importLocalWorkspace, localImportStatus, dataMode, error, running };
}
