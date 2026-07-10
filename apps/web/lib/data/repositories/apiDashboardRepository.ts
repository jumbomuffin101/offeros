import type { DashboardRepository } from "@/lib/data/types/repositories";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";
import type { ApiDataResponse, ApiWorkspaceSummary } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiWorkspaceSummary } from "@/lib/data/api/workspaceSummary";

export const apiDashboardRepository: DashboardRepository = {
  async summary() {
    const response = await apiClient.get<ApiDataResponse<ApiWorkspaceSummary>>("/dashboard/summary");
    const { applications, resumes, prep } = fromApiWorkspaceSummary(response.data);
    return buildDashboardSummary(applications, resumes, prep);
  },
};
