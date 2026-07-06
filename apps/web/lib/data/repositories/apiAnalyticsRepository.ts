import type { AnalyticsRepository } from "@/lib/data/types/repositories";
import { apiApplicationRepository } from "@/lib/data/repositories/apiApplicationRepository";
import { apiResumeRepository } from "@/lib/data/repositories/apiResumeRepository";
import { apiPrepRepository } from "@/lib/data/repositories/apiPrepRepository";
import { buildAnalyticsSummary } from "@/lib/data/repositories/summaryBuilders";
import type { ApiAnalyticsOverview, ApiDataResponse } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";

export const apiAnalyticsRepository: AnalyticsRepository = {
  async summary() {
    const [applications, resumes, prep, overview] = await Promise.all([
      apiApplicationRepository.list(), apiResumeRepository.list(), apiPrepRepository.list(),
      apiClient.get<ApiDataResponse<ApiAnalyticsOverview>>("/analytics/summary"),
    ]);
    const summary = buildAnalyticsSummary(applications, resumes, prep);
    return {
      ...summary,
      empty: overview.data.total_applications === 0
        && overview.data.total_resumes === 0
        && overview.data.completed_coding_problems === 0
        && overview.data.completed_behavioral_questions === 0
        && overview.data.completed_system_design_prompts === 0,
    };
  },
};
