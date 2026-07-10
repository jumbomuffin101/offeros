import type { AnalyticsRepository } from "@/lib/data/types/repositories";
import { buildAnalyticsSummary } from "@/lib/data/repositories/summaryBuilders";
import type { ApiDataResponse, ApiWorkspaceSummary } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiWorkspaceSummary } from "@/lib/data/api/workspaceSummary";

export const apiAnalyticsRepository: AnalyticsRepository = {
  async summary() {
    const response = await apiClient.get<ApiDataResponse<ApiWorkspaceSummary>>("/analytics/summary");
    const { applications, resumes, prep } = fromApiWorkspaceSummary(response.data);
    return buildAnalyticsSummary(applications, resumes, prep);
  },
};
