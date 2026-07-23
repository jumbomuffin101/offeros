import type { ApplicationEvent } from "@/lib/types";

const KEY = "offeros:application-events";

export function readApplicationEvents(): ApplicationEvent[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown; return Array.isArray(value) ? value as ApplicationEvent[] : []; }
  catch { return []; }
}
export function writeApplicationEvents(events: ApplicationEvent[]) { window.localStorage.setItem(KEY, JSON.stringify(events)); }
export function clearApplicationEvents() { window.localStorage.removeItem(KEY); }
