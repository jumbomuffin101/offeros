"use client";

import { useCallback, useState } from "react";
import type { DataError } from "@/lib/data/errors";
import { toDataError } from "@/lib/data/errors";
import { dataMode, workspaceRepository } from "@/lib/data/repositories/repositoryFactory";
import type { LocalImportStatus, WorkspaceScope } from "@/lib/data/types/repositories";
import { announceDataChange } from "@/lib/data/repositories/events";

export function useWorkspaceActions() {
  const [error, setError] = useState<DataError | null>(null);
  const [localImportStatus, setLocalImportStatus] = useState<LocalImportStatus | null>(null);
  const run = useCallback(async (operation: () => Promise<void>) => {
    setError(null);
    try { await operation(); announceDataChange(); return true; }
    catch (cause) { setError(toDataError(cause, "Unable to update the workspace.")); return false; }
  }, []);
  const populateDemo = useCallback(() => run(() => workspaceRepository.populateDemo()), [run]);
  const clearWorkspace = useCallback(() => run(() => workspaceRepository.clearWorkspace()), [run]);
  const clear = useCallback((scope: WorkspaceScope) => run(() => workspaceRepository.clear(scope)), [run]);
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
  return { populateDemo, clearWorkspace, clear, checkLocalImport, importLocalWorkspace, localImportStatus, dataMode, error };
}
