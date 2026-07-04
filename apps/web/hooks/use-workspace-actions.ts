"use client";

import { useCallback, useState } from "react";
import type { DataError } from "@/lib/data/errors";
import { toDataError } from "@/lib/data/errors";
import { workspaceRepository, type WorkspaceScope } from "@/lib/data/repositories/workspaceRepository";
import { announceDataChange } from "@/lib/data/repositories/events";

export function useWorkspaceActions() {
  const [error, setError] = useState<DataError | null>(null);
  const run = useCallback(async (operation: () => Promise<void>) => {
    setError(null);
    try { await operation(); announceDataChange(); return true; }
    catch (cause) { setError(toDataError(cause, "Unable to update the workspace.")); return false; }
  }, []);
  const populateDemo = useCallback(() => run(() => workspaceRepository.populateDemo()), [run]);
  const clearWorkspace = useCallback(() => run(() => workspaceRepository.clearWorkspace()), [run]);
  const clear = useCallback((scope: WorkspaceScope) => run(() => workspaceRepository.clear(scope)), [run]);
  return { populateDemo, clearWorkspace, clear, error };
}
