import type { AnalyticsRepository } from "@/lib/data/types/repositories";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";
import { buildAnalyticsSummary } from "@/lib/data/repositories/summaryBuilders";

export const analyticsRepository: AnalyticsRepository = {
  async summary() {
    const [applications, resumes, prep] = await Promise.all([
      applicationRepository.list(), resumeRepository.list(), prepRepository.list(),
    ]);
    return buildAnalyticsSummary(applications, resumes, prep);
  },
};
