import type { PrepWorkspaceData } from "@/lib/types";
import { buildWeeklyDays } from "@/lib/prep-utils";

export const PREP_STORAGE_KEY = "offeros:prep";

export function readPrep(fallback: PrepWorkspaceData) {
  const raw = browserStorage().getItem(PREP_STORAGE_KEY);
  if (!raw) return clonePrep(fallback);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPrepData(parsed)) return clonePrep(fallback);
    return { ...parsed, weeklyDays: buildWeeklyDays(parsed.sessions) };
  } catch { return clonePrep(fallback); }
}

export function writePrep(data: PrepWorkspaceData) {
  browserStorage().setItem(PREP_STORAGE_KEY, JSON.stringify(data));
}

export function clearPrep() { browserStorage().removeItem(PREP_STORAGE_KEY); }
function browserStorage() { if (typeof window === "undefined") throw new Error("Local storage is only available in the browser."); return window.localStorage; }
function clonePrep(data: PrepWorkspaceData) { return JSON.parse(JSON.stringify(data)) as PrepWorkspaceData; }
function isPrepData(value: unknown): value is PrepWorkspaceData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PrepWorkspaceData>;
  return Array.isArray(data.codingProblems) && Array.isArray(data.behavioralQuestions)
    && Array.isArray(data.systemDesignPrompts) && Array.isArray(data.sessions)
    && Array.isArray(data.weeklyDays) && Array.isArray(data.goals);
}
