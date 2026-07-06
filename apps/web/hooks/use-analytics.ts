"use client";

import { analyticsRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadAnalytics = () => analyticsRepository.summary();
export function useAnalytics() {
  const resource = useRepositoryResource(loadAnalytics);
  return { summary: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh };
}
