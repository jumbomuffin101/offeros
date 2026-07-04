"use client";

import { useCallback } from "react";
import type { ApplicationStatus } from "@/lib/types";
import type { ApplicationInput } from "@/lib/data/types";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadApplications = () => applicationRepository.list();

export function useApplications() {
  const resource = useRepositoryResource(loadApplications);
  const create = useCallback((input: ApplicationInput) => resource.mutate(() => applicationRepository.create(input)), [resource]);
  const update = useCallback((id: string, input: Partial<ApplicationInput>) => resource.mutate(() => applicationRepository.update(id, input)), [resource]);
  const remove = useCallback((id: string) => resource.mutate(() => applicationRepository.delete(id)), [resource]);
  const duplicate = useCallback((id: string) => resource.mutate(() => applicationRepository.duplicate(id)), [resource]);
  const setStatus = useCallback((id: string, status: ApplicationStatus) => update(id, { status }), [update]);
  const reset = useCallback(() => resource.mutate(() => applicationRepository.reset()), [resource]);

  return { applications: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, create, update, delete: remove, duplicate, setStatus, reset };
}
