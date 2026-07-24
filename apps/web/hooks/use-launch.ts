"use client";

import { useCallback } from "react";
import { launchRepository } from "@/lib/data/repositories/launchRepository";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadToday = () => launchRepository.today();
const loadSettings = () => launchRepository.settings();
const loadNotifications = () => launchRepository.notifications();

export function useToday() {
  const resource = useRepositoryResource(loadToday);
  return {
    summary: resource.data,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
  };
}

export function useLaunchSettings() {
  const resource = useRepositoryResource(loadSettings);
  const update = useCallback(
    (input: Parameters<typeof launchRepository.updateSettings>[0]) =>
      resource.mutate(() => launchRepository.updateSettings(input)),
    [resource],
  );
  return {
    settings: resource.data,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    update,
  };
}

export function useNotifications() {
  const resource = useRepositoryResource(loadNotifications);
  const markRead = useCallback(
    async (id: string) => {
      const updated = await launchRepository.markNotificationRead(id);
      resource.patchData((current) => current ? {
        items: current.items.map((item) => item.id === id ? updated : item),
        unreadCount: Math.max(0, current.unreadCount - (current.items.find((item) => item.id === id)?.readAt ? 0 : 1)),
      } : current);
      return updated;
    },
    [resource],
  );
  const markAllRead = useCallback(async () => {
    await launchRepository.markAllNotificationsRead();
    const now = new Date().toISOString();
    resource.patchData((current) => current ? {
      items: current.items.map((item) => ({ ...item, readAt: item.readAt || now })),
      unreadCount: 0,
    } : current);
  }, [resource]);
  return {
    items: resource.data?.items ?? [],
    unreadCount: resource.data?.unreadCount ?? 0,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    markRead,
    markAllRead,
  };
}
