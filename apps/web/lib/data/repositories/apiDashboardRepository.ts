import type { DashboardRepository } from "@/lib/data/types/repositories";
import { apiApplicationRepository } from "@/lib/data/repositories/apiApplicationRepository";
import { apiResumeRepository } from "@/lib/data/repositories/apiResumeRepository";
import { apiPrepRepository } from "@/lib/data/repositories/apiPrepRepository";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";

export const apiDashboardRepository: DashboardRepository = {
  async summary() {
    const [applications, resumes, prep] = await Promise.all([
      apiApplicationRepository.list(), apiResumeRepository.list(), apiPrepRepository.list(),
    ]);
    return buildDashboardSummary(applications, resumes, prep);
  },
};
