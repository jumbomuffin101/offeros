"use client";

import { useCallback } from "react";
import type { MockInterviewCreateInput } from "@/lib/data/types";
import { mockInterviewRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";
import { announceDataChange } from "@/lib/data/repositories/events";

const loadSessions = () => mockInterviewRepository.list();

export function useMockInterviews() {
  const resource = useRepositoryResource(loadSessions);
  const create = useCallback(
    (input: MockInterviewCreateInput) =>
      resource.mutate(() => mockInterviewRepository.create(input)),
    [resource],
  );
  const plan = useCallback(
    (input: MockInterviewCreateInput) => mockInterviewRepository.plan(input),
    [],
  );
  const answer = useCallback(
    async (id: string, value: string, answerRequestId: string) => {
      const result = await mockInterviewRepository.answer(
        id,
        value,
        answerRequestId,
      );
      resource.patchData((current) =>
        current?.map((session) =>
          session.id === id ? result.session : session,
        ) ?? current,
      );
      if (result.session.status === "completed") announceDataChange();
      return result;
    },
    [resource],
  );
  const abandon = useCallback(
    (id: string) =>
      resource.mutate(() => mockInterviewRepository.abandon(id)),
    [resource],
  );
  return {
    sessions: resource.data ?? [],
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    get: mockInterviewRepository.get,
    plan,
    create,
    answer,
    abandon,
  };
}
