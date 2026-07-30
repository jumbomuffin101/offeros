import type { DashboardRepository } from "@/lib/data/types/repositories";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";
import { applicationEventRepository } from "@/lib/data/repositories/applicationEventRepository";
import { inboxRepository } from "@/lib/data/repositories/inboxRepository";

export const dashboardRepository: DashboardRepository = {
  async summary() {
    const [applications, resumes, prep, upcomingEvents, inbox] = await Promise.all([
      applicationRepository.list(), resumeRepository.list(), prepRepository.list(), applicationEventRepository.upcoming(), inboxRepository.list(),
    ]);
    return buildDashboardSummary(applications, resumes, prep, upcomingEvents, inbox.items.slice(0, 5));
  },
};
