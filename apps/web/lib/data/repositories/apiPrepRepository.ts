import type { PrepSession, PrepWorkspaceData } from "@/lib/types";
import type { PrepRepository } from "@/lib/data/types/repositories";
import type {
  ApiBehavioralQuestion,
  ApiCodingProblem,
  ApiDataResponse,
  ApiSystemDesignPrompt,
} from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import {
  fromApiBehavioral,
  fromApiCoding,
  fromApiSystemDesign,
  toApiBehavioral,
  toApiCoding,
  toApiPrepUpdate,
  toApiSystemDesign,
} from "@/lib/data/api/mappers";
import { readApiPrepGoals, writeApiPrepGoals } from "@/lib/data/storage/local/apiPrepStorage";
import { prepWorkspaceData } from "@/lib/mock-data";
import { buildWeeklyDays } from "@/lib/prep-utils";

export const apiPrepRepository: PrepRepository = {
  async list() {
    const [codingResponse, behavioralResponse, systemResponse] = await Promise.all([
      apiClient.get<ApiDataResponse<ApiCodingProblem[]>>("/prep/coding"),
      apiClient.get<ApiDataResponse<ApiBehavioralQuestion[]>>("/prep/behavioral"),
      apiClient.get<ApiDataResponse<ApiSystemDesignPrompt[]>>("/prep/system-design"),
    ]);
    const codingProblems = codingResponse.data.map(fromApiCoding);
    const behavioralQuestions = behavioralResponse.data.map(fromApiBehavioral);
    const systemDesignPrompts = systemResponse.data.map(fromApiSystemDesign);
    const sessions: PrepSession[] = [
      ...codingProblems.filter((item) => item.status === "Completed").map((item) => ({ id: `coding-${item.id}`, itemId: item.id, type: "coding" as const, completedAt: item.completedAt || item.updatedAt })),
      ...behavioralQuestions.filter((item) => item.status === "Completed").map((item) => ({ id: `behavioral-${item.id}`, itemId: item.id, type: "behavioral" as const, completedAt: item.updatedAt })),
      ...systemDesignPrompts.filter((item) => item.status === "Completed").map((item) => ({ id: `system-${item.id}`, itemId: item.id, type: "systemDesign" as const, completedAt: item.updatedAt })),
    ];
    return {
      codingProblems,
      behavioralQuestions,
      systemDesignPrompts,
      sessions,
      weeklyDays: buildWeeklyDays(sessions),
      goals: readApiPrepGoals(prepWorkspaceData.goals),
    };
  },
  async get(id) {
    const data = await this.list();
    return [...data.codingProblems, ...data.behavioralQuestions, ...data.systemDesignPrompts].find((item) => item.id === id) ?? null;
  },
  async create(input) {
    if (input.type === "coding") {
      const response = await apiClient.post<ApiDataResponse<ApiCodingProblem>>("/prep/coding", toApiCoding(input.value));
      return fromApiCoding(response.data);
    }
    if (input.type === "behavioral") {
      const response = await apiClient.post<ApiDataResponse<ApiBehavioralQuestion>>("/prep/behavioral", toApiBehavioral(input.value));
      return fromApiBehavioral(response.data);
    }
    const response = await apiClient.post<ApiDataResponse<ApiSystemDesignPrompt>>("/prep/system-design", toApiSystemDesign(input.value));
    return fromApiSystemDesign(response.data);
  },
  async update(id, input) {
    if (input.type === "coding") {
      const response = await apiClient.patch<ApiDataResponse<ApiCodingProblem>>(`/prep/coding/${id}`, toApiPrepUpdate(input));
      return fromApiCoding(response.data);
    }
    if (input.type === "behavioral") {
      const response = await apiClient.patch<ApiDataResponse<ApiBehavioralQuestion>>(`/prep/behavioral/${id}`, toApiPrepUpdate(input));
      return fromApiBehavioral(response.data);
    }
    const response = await apiClient.patch<ApiDataResponse<ApiSystemDesignPrompt>>(`/prep/system-design/${id}`, toApiPrepUpdate(input));
    return fromApiSystemDesign(response.data);
  },
  async delete(id) {
    const data = await this.list();
    if (data.codingProblems.some((item) => item.id === id)) return apiClient.delete(`/prep/coding/${id}`);
    if (data.behavioralQuestions.some((item) => item.id === id)) return apiClient.delete(`/prep/behavioral/${id}`);
    return apiClient.delete(`/prep/system-design/${id}`);
  },
  async replace(data: PrepWorkspaceData) {
    writeApiPrepGoals(data.goals);
    return this.list();
  },
  async reset() {
    writeApiPrepGoals(prepWorkspaceData.goals);
    await apiClient.post("/workspace/reset", {
      scope: "prep",
      applications: [],
      resumes: [],
      coding_problems: prepWorkspaceData.codingProblems.map(({ id: _id, completedAt: _completedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...value }) => toApiCoding(value)),
      behavioral_questions: prepWorkspaceData.behavioralQuestions.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...value }) => toApiBehavioral(value)),
      system_design_prompts: prepWorkspaceData.systemDesignPrompts.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...value }) => toApiSystemDesign(value)),
    });
    return this.list();
  },
};
