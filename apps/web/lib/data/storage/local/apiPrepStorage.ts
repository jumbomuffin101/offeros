import type { PrepGoal } from "@/lib/types";

const API_PREP_GOALS_KEY = "offeros:api-prep-goals";

export function readApiPrepGoals(fallback: PrepGoal[]) {
  if (typeof window === "undefined") return structuredClone(fallback);
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(API_PREP_GOALS_KEY) ?? "null");
    return Array.isArray(parsed) ? parsed as PrepGoal[] : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
}

export function writeApiPrepGoals(goals: PrepGoal[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(API_PREP_GOALS_KEY, JSON.stringify(goals));
}
