import type { AnalyticsMetric, Application, ApplicationPriority, ApplicationStatus, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import { applicationStatuses } from "@/lib/mock-data";
import { calculateStreak, prepGoalProgress } from "@/lib/prep-utils";
import { percent, submittedApplications } from "@/lib/dashboard-utils";

export type CountDatum = { label: string; value: number };
export type AnalyticsModel = {
  metrics: AnalyticsMetric[];
  applicationsOverTime: CountDatum[];
  statusDistribution: Array<{ label: ApplicationStatus; value: number }>;
  sourceDistribution: CountDatum[];
  priorityDistribution: Array<{ label: ApplicationPriority; value: number }>;
  mostUsedResume: { name: string; uses: number } | null;
  bestMatchResume: ResumeVersion | null;
  prepTrend: Array<{ label: string; value: number; total: number }>;
  prepStreak: number;
  goalProgress: Array<{ label: string; current: number; target: number }>;
  conversion: Array<{ label: string; value: number; percent: number }>;
  averageDeadlineDays: number | null;
};

export function buildAnalytics(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData, asOf: string): AnalyticsModel {
  const submitted = submittedApplications(applications);
  const responses = submitted.filter((item) => ["OA", "Interview", "Final Round", "Offer", "Rejected"].includes(item.status));
  const oa = submitted.filter((item) => ["OA", "Interview", "Final Round", "Offer"].includes(item.status));
  const interviews = submitted.filter((item) => ["Interview", "Final Round", "Offer"].includes(item.status));
  const offers = submitted.filter((item) => item.status === "Offer");
  const rejections = submitted.filter((item) => item.status === "Rejected");
  const averageDeadlineDays = averageAppliedToDeadline(applications);
  const metrics: AnalyticsMetric[] = [
    { id: "response", label: "Response rate", value: rate(responses.length, submitted.length), helper: `${responses.length} responses from ${submitted.length} submitted applications`, change: submitted.length ? "Includes OAs, interviews, offers, and rejections" : "Submit applications to unlock this rate", tone: "green" },
    { id: "oa", label: "OA conversion", value: rate(oa.length, submitted.length), helper: `${oa.length} reached assessment or later`, change: "Share of submitted applications", tone: "cyan" },
    { id: "interview", label: "Interview conversion", value: rate(interviews.length, submitted.length), helper: `${interviews.length} reached an interview loop`, change: "Includes final rounds and offers", tone: "amber" },
    { id: "offer", label: "Offer rate", value: rate(offers.length, submitted.length), helper: `${offers.length} offer${offers.length === 1 ? "" : "s"} from ${submitted.length} submissions`, change: "Outcome conversion", tone: "purple" },
    { id: "rejection", label: "Rejection rate", value: rate(rejections.length, submitted.length), helper: `${rejections.length} closed without an offer`, change: "Useful for calibrating targeting", tone: "red" },
  ];
  return {
    metrics,
    applicationsOverTime: weeklyApplications(applications, asOf),
    statusDistribution: applicationStatuses.map((status) => ({ label: status, value: applications.filter((item) => item.status === status).length })),
    sourceDistribution: countBy(applications, (item) => item.source || "Unspecified"),
    priorityDistribution: (["High", "Medium", "Low"] as ApplicationPriority[]).map((priority) => ({ label: priority, value: applications.filter((item) => item.priority === priority).length })),
    mostUsedResume: mostUsedResume(applications, resumes),
    bestMatchResume: [...resumes].sort((a, b) => b.keywordMatchScore - a.keywordMatchScore)[0] ?? null,
    prepTrend: prep.weeklyDays.map((day) => ({ label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`)), value: day.coding + day.behavioral + day.systemDesign, total: 3 })),
    prepStreak: calculateStreak(prep.weeklyDays),
    goalProgress: prep.goals.map((goal) => ({ label: goal.label, current: prepGoalProgress(goal, prep.sessions, prep.weeklyDays), target: goal.target })),
    conversion: [
      { label: "Submitted", value: submitted.length, percent: submitted.length ? 100 : 0 },
      { label: "OA+", value: oa.length, percent: percent(oa.length, submitted.length) },
      { label: "Interview+", value: interviews.length, percent: percent(interviews.length, submitted.length) },
      { label: "Offer", value: offers.length, percent: percent(offers.length, submitted.length) },
    ],
    averageDeadlineDays,
  };
}

function weeklyApplications(applications: Application[], asOf: string) {
  const end = new Date(asOf);
  end.setHours(23, 59, 59, 999);
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(end);
    start.setDate(start.getDate() - (5 - index) * 7 - 6);
    const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
    return { label, value: 0 };
  });
  for (const application of applications) {
    const value = application.dateApplied ? `${application.dateApplied}T12:00:00` : application.createdAt;
    const difference = end.getTime() - new Date(value).getTime();
    const weeksAgo = Math.floor(difference / (7 * 86_400_000));
    const index = 5 - weeksAgo;
    if (index >= 0 && index < buckets.length) buckets[index].value += 1;
  }
  return buckets;
}

function countBy(applications: Application[], key: (application: Application) => string) {
  const counts = new Map<string, number>();
  for (const application of applications) counts.set(key(application), (counts.get(key(application)) ?? 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function mostUsedResume(applications: Application[], resumes: ResumeVersion[]) {
  const usage = new Map<string, number>();
  for (const application of applications) if (application.resumeUsed) usage.set(application.resumeUsed, (usage.get(application.resumeUsed) ?? 0) + 1);
  const linked = [...usage.entries()].sort((a, b) => b[1] - a[1])[0];
  if (linked) return { name: linked[0], uses: linked[1] };
  const fallback = [...resumes].sort((a, b) => b.applicationsUsed - a.applicationsUsed)[0];
  return fallback ? { name: fallback.name, uses: fallback.applicationsUsed } : null;
}

function averageAppliedToDeadline(applications: Application[]) {
  const values = applications.flatMap((application) => {
    if (!application.dateApplied || !application.deadline) return [];
    const days = Math.round((new Date(`${application.deadline}T12:00:00`).getTime() - new Date(`${application.dateApplied}T12:00:00`).getTime()) / 86_400_000);
    return days >= 0 ? [days] : [];
  });
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function rate(value: number, total: number) { return total ? `${percent(value, total)}%` : "—"; }
