"use client";

import { useCallback } from "react";
import type { AttentionCategory } from "@/lib/types";
import { inboxRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadInbox = () => inboxRepository.list();

export function useInbox() {
  const resource = useRepositoryResource(loadInbox);
  const override = useCallback(
    (
      applicationId: string,
      category: AttentionCategory,
      action: "dismiss" | "snooze",
      duration?: "tomorrow" | "3_days" | "1_week",
    ) => resource.mutate(() => inboxRepository.override({
      applicationId,
      category,
      action,
      duration,
    })),
    [resource],
  );
  return {
    inbox: resource.data,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    dismiss: (applicationId: string, category: AttentionCategory) =>
      override(applicationId, category, "dismiss"),
    snooze: (
      applicationId: string,
      category: AttentionCategory,
      duration: "tomorrow" | "3_days" | "1_week",
    ) => override(applicationId, category, "snooze", duration),
  };
}
