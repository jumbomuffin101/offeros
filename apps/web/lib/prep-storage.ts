import type { PrepWorkspaceData } from "@/lib/types";
import { PREP_STORAGE_KEY, readPrep, writePrep } from "@/lib/data/storage/local/prepStorage";

export { PREP_STORAGE_KEY };

export function loadStoredPrep(fallback: PrepWorkspaceData) {
  try {
    return readPrep(fallback);
  } catch {
    return clonePrep(fallback);
  }
}

export function saveStoredPrep(data: PrepWorkspaceData) {
  writePrep(data);
}

export function resetStoredPrep(fallback: PrepWorkspaceData) {
  const reset = clonePrep(fallback);
  saveStoredPrep(reset);
  return reset;
}

function clonePrep(data: PrepWorkspaceData) {
  return JSON.parse(JSON.stringify(data)) as PrepWorkspaceData;
}
