import type { ApplicationRepository } from "@/lib/data/types/repositories";
import type { ApiApplication, ApiApplicationAnalyzeResponse, ApiDataResponse } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiApplication, fromApiResumeAnalysis, toApiApplication } from "@/lib/data/api/mappers";
import { resetApiWorkspace } from "@/lib/data/repositories/apiWorkspaceReset";

export const apiApplicationRepository: ApplicationRepository = {
  async list() {
    const response = await apiClient.get<ApiDataResponse<ApiApplication[]>>("/applications");
    return response.data.map(fromApiApplication);
  },
  async get(id) {
    const response = await apiClient.get<ApiDataResponse<ApiApplication>>(`/applications/${id}`);
    return fromApiApplication(response.data);
  },
  async create(input) {
    const response = await apiClient.post<ApiDataResponse<ApiApplication>>("/applications", toApiApplication(input));
    return fromApiApplication(response.data);
  },
  async update(id, input) {
    const response = await apiClient.patch<ApiDataResponse<ApiApplication>>(`/applications/${id}`, toApiApplication(input));
    return fromApiApplication(response.data);
  },
  async delete(id) {
    await apiClient.delete(`/applications/${id}`);
  },
  async duplicate(id) {
    const source = await this.get(id);
    if (!source) throw new Error("Application not found.");
    const { id: _id, category: _category, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = source;
    return this.create({ ...input, company: `${source.company} Copy` });
  },
  async reset() {
    await resetApiWorkspace("applications", "sample");
    return this.list();
  },
  async analyzeResume(id, analysisRequestId) {
    const response = await apiClient.post<ApiApplicationAnalyzeResponse>(
      `/applications/${id}/analyze-resume`,
      { analysis_request_id: analysisRequestId },
      { timeoutMs: 300000 },
    );
    return {
      application: fromApiApplication(response.application),
      analysis: fromApiResumeAnalysis(response.analysis),
    };
  },
};
