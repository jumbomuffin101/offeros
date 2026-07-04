import type { AnalyticsRepository } from "@/lib/data/types/repositories";
import { buildAnalytics } from "@/lib/analytics-utils";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { prepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";

export const analyticsRepository: AnalyticsRepository = {
  async summary() {
    const [applications, resumes, prep] = await Promise.all([
      applicationRepository.list(), resumeRepository.list(), prepRepository.list(),
    ]);
    const asOf = new Date().toISOString();
    return {
      analytics: buildAnalytics(applications, resumes, prep, asOf),
      resumes,
      empty: !applications.length && !resumes.length && !prep.sessions.length,
      asOf,
    };
  },
};
