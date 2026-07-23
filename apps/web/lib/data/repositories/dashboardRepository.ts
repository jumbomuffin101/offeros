import type { DashboardRepository } from "@/lib/data/types/repositories";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";
import { applicationEventRepository } from "@/lib/data/repositories/applicationEventRepository";

export const dashboardRepository: DashboardRepository = {
  async summary() {
    const [applications, resumes, prep, upcomingEvents, focus] = await Promise.all([
      applicationRepository.list(), resumeRepository.list(), prepRepository.list(), applicationEventRepository.upcoming(), applicationEventRepository.focus(),
    ]);
    return buildDashboardSummary(applications, resumes, prep, upcomingEvents, focus);
  },
};
