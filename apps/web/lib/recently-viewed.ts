import { RECENTLY_VIEWED_KEY } from "@/lib/workspace-data";

export type RecentlyViewedItem = {
  id: string;
  type: "Application" | "Resume" | "Prep";
  label: string;
  detail: string;
  href: "/applications" | "/resumes" | "/prep";
  viewedAt: string;
};

export const RECENTLY_VIEWED_EVENT = "offeros:recently-viewed-change";

export function loadRecentlyViewed() {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isRecentItem).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  const next = [
    { ...item, viewedAt: new Date().toISOString() },
    ...loadRecentlyViewed().filter((current) => !(current.id === item.id && current.type === item.type)),
  ].slice(0, 5);
  window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
}

function isRecentItem(value: unknown): value is RecentlyViewedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecentlyViewedItem>;
  return typeof item.id === "string" && typeof item.label === "string" && typeof item.href === "string";
}
