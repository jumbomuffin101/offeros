"use client";

import { dashboardRepository } from "@/lib/data/repositories/dashboardRepository";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadDashboard = () => dashboardRepository.summary();
export function useDashboard() {
  const resource = useRepositoryResource(loadDashboard);
  return { summary: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh };
}
