"use client";

import { gmailRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const load = () => Promise.all([gmailRepository.status(), gmailRepository.suggestions()]);

export function useGmail() {
  const resource = useRepositoryResource(load);
  return {
    status: resource.data?.[0] ?? null,
    suggestions: resource.data?.[1] ?? [],
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    connect: () => resource.mutate(() => gmailRepository.connect()),
    sync: () => resource.mutate(() => gmailRepository.sync()),
    accept: (id: string, input: Parameters<typeof gmailRepository.accept>[1]) => resource.mutate(() => gmailRepository.accept(id, input)),
    reject: (id: string) => resource.mutate(() => gmailRepository.reject(id)),
    disconnect: (deleteDerivedData: boolean) => resource.mutate(() => gmailRepository.disconnect(deleteDerivedData)),
    deleteDerivedData: () => resource.mutate(() => gmailRepository.deleteDerivedData()),
  };
}
