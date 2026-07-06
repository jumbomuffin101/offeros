import type { Application, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import type { AnalyticsSummary, DashboardSummary } from "@/lib/data/types";
import { buildAnalytics } from "@/lib/analytics-utils";
import {
  applicationCounts,
  recentActivity,
  recruitingMomentum,
  recruitingPlan,
  responseRate,
  upcomingDeadlines,
  weeklyPrepCompletion,
} from "@/lib/dashboard-utils";
import { calculateStreak } from "@/lib/prep-utils";

export function buildDashboardSummary(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData): DashboardSummary {
  const asOf = new Date().toISOString();
  return {
    applications, resumes, prep, asOf,
    counts: applicationCounts(applications),
    plan: recruitingPlan(applications, resumes, prep, asOf),
    momentum: recruitingMomentum(applications, resumes, prep, asOf),
    prepValues: prep.weeklyDays.map((day) => Math.min(100, (day.coding + day.behavioral + day.systemDesign) * 32)),
    applicationValues: weeklyApplicationSparkline(applications, asOf),
    responseRate: responseRate(applications),
    prepStreak: calculateStreak(prep.weeklyDays),
    weeklyPrepCompletion: weeklyPrepCompletion(prep),
    deadlines: upcomingDeadlines(applications, asOf),
    activities: recentActivity(applications, resumes, prep, asOf),
    empty: !applications.length && !resumes.length && !prep.sessions.length && !prep.codingProblems.length && !prep.behavioralQuestions.length && !prep.systemDesignPrompts.length,
  };
}

export function buildAnalyticsSummary(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData): AnalyticsSummary {
  const asOf = new Date().toISOString();
  return {
    analytics: buildAnalytics(applications, resumes, prep, asOf),
    resumes,
    empty: !applications.length && !resumes.length && !prep.sessions.length,
    asOf,
  };
}

function weeklyApplicationSparkline(applications: Array<{ createdAt: string }>, asOf: string) {
  const asOfTime = new Date(asOf).getTime();
  return Array.from({ length: 7 }, (_, index) => applications.filter((application) => {
    const days = Math.floor((asOfTime - new Date(application.createdAt).getTime()) / 86_400_000);
    return days >= 0 && days <= 6 - index;
  }).length * 10 + 18);
}
