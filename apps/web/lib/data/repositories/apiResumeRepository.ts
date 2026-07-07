import type { ResumeRepository } from "@/lib/data/types/repositories";
import type { ApiDataResponse, ApiResume, ApiResumeAnalysis } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiResume, fromApiResumeAnalysis, toApiResume, toApiResumeAnalysis } from "@/lib/data/api/mappers";
import { resumes as demoResumes } from "@/lib/mock-data";

export const apiResumeRepository: ResumeRepository = {
  async list() {
    const response = await apiClient.get<ApiDataResponse<ApiResume[]>>("/resumes");
    return response.data.map(fromApiResume);
  },
  async get(id) {
    const response = await apiClient.get<ApiDataResponse<ApiResume>>(`/resumes/${id}`);
    return fromApiResume(response.data);
  },
  async create(input) {
    const response = await apiClient.post<ApiDataResponse<ApiResume>>("/resumes", toApiResume(input));
    return fromApiResume(response.data);
  },
  async update(id, input) {
    const response = await apiClient.patch<ApiDataResponse<ApiResume>>(`/resumes/${id}`, toApiResume(input));
    return fromApiResume(response.data);
  },
  async delete(id) {
    await apiClient.delete(`/resumes/${id}`);
  },
  async duplicate(id) {
    const response = await apiClient.post<ApiDataResponse<ApiResume>>(`/resumes/${id}/duplicate`, {});
    return fromApiResume(response.data);
  },
  async reset() {
    await apiClient.post("/workspace/reset", {
      scope: "resumes",
      applications: [],
      resumes: demoResumes.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, lastUpdated: _lastUpdated, ...input }) => toApiResume(input)),
      coding_problems: [],
      behavioral_questions: [],
      system_design_prompts: [],
    });
    return this.list();
  },
  async analyzeResume(resumeId, payload) {
    const response = await apiClient.post<ApiDataResponse<ApiResumeAnalysis>>(`/resumes/${resumeId}/analyze`, toApiResumeAnalysis(payload));
    return fromApiResumeAnalysis(response.data);
  },
  async listResumeAnalyses(resumeId) {
    const response = await apiClient.get<ApiDataResponse<ApiResumeAnalysis[]>>(`/resumes/${resumeId}/analyses`);
    return response.data.map(fromApiResumeAnalysis);
  },
  async getResumeAnalysis(id) {
    const response = await apiClient.get<ApiDataResponse<ApiResumeAnalysis>>(`/resume-analyses/${id}`);
    return fromApiResumeAnalysis(response.data);
  },
  async deleteResumeAnalysis(id) {
    await apiClient.delete(`/resume-analyses/${id}`);
  },
};
