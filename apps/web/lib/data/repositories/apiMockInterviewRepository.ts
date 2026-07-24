import { apiClient } from "@/lib/data/api/apiClient";
import {
  fromApiEvaluation,
  fromApiMockInterview,
  fromApiTurn,
} from "@/lib/data/api/mockInterviewMappers";
import {
  MOCK_INTERVIEW_TIMEOUT_MESSAGE,
  MOCK_INTERVIEW_TIMEOUT_MS,
} from "@/lib/data/api/request-timeouts";
import type { MockInterviewRepository } from "@/lib/data/types/repositories";

type DataResponse = { data: Record<string, unknown> };

export const apiMockInterviewRepository: MockInterviewRepository = {
  async list() {
    const response = await apiClient.get<{ data: Record<string, unknown>[] }>(
      "/mock-interviews",
    );
    return response.data.map(fromApiMockInterview);
  },
  async get(id) {
    const response = await apiClient.get<DataResponse>(`/mock-interviews/${id}`);
    return fromApiMockInterview(response.data);
  },
  async create(input) {
    const response = await apiClient.post<{
      session: Record<string, unknown>;
      first_turn: Record<string, unknown>;
    }>(
      "/mock-interviews",
      {
        application_id: input.applicationId ?? null,
        resume_version_id: input.resumeVersionId ?? null,
        interview_type: input.interviewType,
        difficulty: input.difficulty,
        question_count: input.questionCount,
      },
      {
        timeoutMs: MOCK_INTERVIEW_TIMEOUT_MS,
        timeoutMessage: MOCK_INTERVIEW_TIMEOUT_MESSAGE,
      },
    );
    return {
      session: fromApiMockInterview(response.session),
      firstTurn: fromApiTurn(response.first_turn),
    };
  },
  async answer(id, answer, answerRequestId) {
    const response = await apiClient.post<{
      session: Record<string, unknown>;
      evaluation: Record<string, unknown>;
      next_question?: Record<string, unknown> | null;
      progress: {
        completed_questions: number;
        total_questions: number;
        follow_up_count: number;
      };
    }>(
      `/mock-interviews/${id}/answer`,
      { answer, answer_request_id: answerRequestId },
      {
        timeoutMs: MOCK_INTERVIEW_TIMEOUT_MS,
        timeoutMessage: MOCK_INTERVIEW_TIMEOUT_MESSAGE,
      },
    );
    return {
      session: fromApiMockInterview(response.session),
      evaluation: fromApiEvaluation(response.evaluation),
      nextQuestion: response.next_question
        ? fromApiTurn(response.next_question)
        : undefined,
      progress: {
        completedQuestions: response.progress.completed_questions,
        totalQuestions: response.progress.total_questions,
        followUpCount: response.progress.follow_up_count,
      },
    };
  },
  async abandon(id) {
    const response = await apiClient.post<DataResponse>(
      `/mock-interviews/${id}/abandon`,
      {},
    );
    return fromApiMockInterview(response.data);
  },
};
