import { readRecentlyViewed, writeRecentlyViewed, type RecentlyViewedItem } from "@/lib/data/storage/local/recentlyViewedStorage";

export type { RecentlyViewedItem };

export const RECENTLY_VIEWED_EVENT = "offeros:recently-viewed-change";

export function loadRecentlyViewed() {
  return readRecentlyViewed();
}

export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  const next = [
    { ...item, viewedAt: new Date().toISOString() },
    ...loadRecentlyViewed().filter((current) => !(current.id === item.id && current.type === item.type)),
  ].slice(0, 5);
  writeRecentlyViewed(next);
  window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
}
