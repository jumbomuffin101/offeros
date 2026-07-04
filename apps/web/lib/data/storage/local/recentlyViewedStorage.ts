export type RecentlyViewedItem = {
  id: string;
  type: "Application" | "Resume" | "Prep";
  label: string;
  detail: string;
  href: "/applications" | "/resumes" | "/prep";
  viewedAt: string;
};

const RECENTLY_VIEWED_KEY = "offeros:recently-viewed";

export function readRecentlyViewed() {
  try {
    const parsed: unknown = JSON.parse(browserStorage().getItem(RECENTLY_VIEWED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isRecentItem).slice(0, 5) : [];
  } catch { return []; }
}

export function writeRecentlyViewed(items: RecentlyViewedItem[]) {
  browserStorage().setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
}

function browserStorage() {
  if (typeof window === "undefined") throw new Error("Local storage is only available in the browser.");
  return window.localStorage;
}
function isRecentItem(value: unknown): value is RecentlyViewedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecentlyViewedItem>;
  return typeof item.id === "string" && typeof item.label === "string" && typeof item.href === "string";
}
