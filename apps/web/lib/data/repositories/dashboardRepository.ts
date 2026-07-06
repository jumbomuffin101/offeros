import type { DashboardRepository } from "@/lib/data/types/repositories";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";

export const dashboardRepository: DashboardRepository = {
  async summary() {
    const [applications, resumes, prep] = await Promise.all([
      applicationRepository.list(), resumeRepository.list(), prepRepository.list(),
    ]);
    return buildDashboardSummary(applications, resumes, prep);
  },
};
