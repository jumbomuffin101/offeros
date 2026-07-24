import type { LocalAttentionOverride } from "@/lib/application-attention-utils";

const STORAGE_KEY = "offeros.application-attention-overrides.v1";

export function readAttentionOverrides(): LocalAttentionOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeAttentionOverrides(overrides: LocalAttentionOverride[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearAttentionOverrides() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
