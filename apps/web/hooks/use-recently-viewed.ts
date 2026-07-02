"use client";

import { useEffect, useState } from "react";
import { loadRecentlyViewed, RECENTLY_VIEWED_EVENT, type RecentlyViewedItem } from "@/lib/recently-viewed";

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    function refresh() { setItems(loadRecentlyViewed()); }
    window.queueMicrotask(refresh);
    window.addEventListener(RECENTLY_VIEWED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return items;
}
