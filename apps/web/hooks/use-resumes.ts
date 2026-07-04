"use client";

import { useCallback } from "react";
import type { ResumeVersion } from "@/lib/types";
import type { ResumeInput } from "@/lib/data/types";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadResumes = () => resumeRepository.list();

export function useResumes() {
  const resource = useRepositoryResource(loadResumes);
  const create = useCallback((input: ResumeInput) => resource.mutate(() => resumeRepository.create(input)), [resource]);
  const update = useCallback((id: string, input: Partial<ResumeInput>) => resource.mutate(() => resumeRepository.update(id, input)), [resource]);
  const remove = useCallback((id: string) => resource.mutate(() => resumeRepository.delete(id)), [resource]);
  const duplicate = useCallback((id: string) => resource.mutate(() => resumeRepository.duplicate(id)), [resource]);
  const toggleStatus = useCallback((resume: ResumeVersion) => update(resume.id, { status: resume.status === "Active" ? "Draft" : "Active" }), [update]);
  const reset = useCallback(() => resource.mutate(() => resumeRepository.reset()), [resource]);
  return { resumes: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh, create, update, delete: remove, duplicate, toggleStatus, reset };
}
