import type { ResumeRepository } from "@/lib/data/types/repositories";
import type { ApiDataResponse, ApiResume } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiResume, toApiResume } from "@/lib/data/api/mappers";
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
    const current = await this.list();
    await Promise.all(current.map((item) => this.delete(item.id)));
    return Promise.all(demoResumes.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, lastUpdated: _lastUpdated, ...input }) => this.create(input)));
  },
};
