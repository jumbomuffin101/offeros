"use client";

import { useCallback } from "react";
import type { BehavioralQuestion, PrepGoal, PrepStatus } from "@/lib/types";
import type { CodingProblemInput, SystemDesignInput } from "@/lib/data/types";
import { DataError } from "@/lib/data/errors";
import { prepRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";

const loadPrep = () => prepRepository.list();

export function usePrep() {
  const resource = useRepositoryResource(loadPrep);
  const saveCoding = useCallback((input: CodingProblemInput, id?: string) => resource.mutate(() => id
    ? prepRepository.update(id, { type: "coding", value: input })
    : prepRepository.create({ type: "coding", value: input })), [resource]);
  const setCodingStatus = useCallback((id: string, status: PrepStatus) => resource.mutate(() => prepRepository.update(id, { type: "coding", value: { status } })), [resource]);
  const saveBehavioral = useCallback((question: BehavioralQuestion) => resource.mutate(() => prepRepository.update(question.id, { type: "behavioral", value: question })), [resource]);
  const setBehavioralStatus = useCallback((id: string, status: PrepStatus) => resource.mutate(() => prepRepository.update(id, { type: "behavioral", value: { status } })), [resource]);
  const saveSystemDesign = useCallback((input: SystemDesignInput, id?: string) => resource.mutate(() => id
    ? prepRepository.update(id, { type: "systemDesign", value: input })
    : prepRepository.create({ type: "systemDesign", value: input })), [resource]);
  const setSystemDesignStatus = useCallback((id: string, status: PrepStatus) => resource.mutate(() => prepRepository.update(id, { type: "systemDesign", value: { status } })), [resource]);
  const saveGoals = useCallback((goals: PrepGoal[]) => resource.mutate(async () => {
    const current = await prepRepository.list();
    return prepRepository.replace({ ...current, goals });
  }), [resource]);
  const reset = useCallback(() => resource.mutate(() => prepRepository.reset()), [resource]);
  const remove = useCallback((id: string) => resource.mutate(() => prepRepository.delete(id)), [resource]);
  const get = useCallback(async (id: string) => {
    const item = await prepRepository.get(id);
    if (!item) throw new DataError("NOT_FOUND", "Prep item not found.");
    return item;
  }, []);

  return {
    data: resource.data, loading: resource.loading, error: resource.error, refresh: resource.refresh,
    saveCoding, setCodingStatus, saveBehavioral, setBehavioralStatus,
    saveSystemDesign, setSystemDesignStatus, saveGoals, reset, delete: remove, get,
  };
}
