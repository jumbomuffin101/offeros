import type { Activity, Application, ApplicationStatus, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import { calculateStreak, prepGoalProgress } from "@/lib/prep-utils";

export type DashboardDeadline = {
  id: string;
  company: string;
  role: string;
  deadline: string;
  status: ApplicationStatus;
  urgency: "Low" | "Medium" | "High";
};

export type RecruitingPlanItem = {
  id: string;
  label: string;
  detail: string;
  priority: "High" | "Today" | "Next";
  complete: boolean;
};

export type MomentumSummary = {
  score: number;
  label: string;
  explanation: string;
  applicationsThisWeek: number;
  prepThisWeek: number;
  activeSignals: number;
  resumeUpdates: number;
  dailyValues: number[];
};

export function applicationCounts(applications: Application[]) {
  return APPLICATION_STATUSES.reduce((counts, status) => {
    counts[status] = applications.filter((application) => application.status === status).length;
    return counts;
  }, {} as Record<ApplicationStatus, number>);
}

export function submittedApplications(applications: Application[]) {
  return applications.filter((application) => application.dateApplied || !["Wishlist", "Applying"].includes(application.status));
}

export function responseRate(applications: Application[]) {
  const submitted = submittedApplications(applications);
  const responses = submitted.filter((application) => ["OA", "Interview", "Final Round", "Offer", "Rejected"].includes(application.status));
  return percent(responses.length, submitted.length);
}

export function weeklyPrepCompletion(prep: PrepWorkspaceData) {
  const goals = prep.goals.filter((goal) => goal.id !== "followUps");
  const completed = goals.reduce((total, goal) => total + prepGoalProgress(goal, prep.sessions, prep.weeklyDays), 0);
  const target = goals.reduce((total, goal) => total + goal.target, 0);
  return percent(completed, target);
}

export function upcomingDeadlines(applications: Application[], asOf: string, limit = 4): DashboardDeadline[] {
  const today = startOfDay(asOf);
  return applications
    .filter((application) => application.deadline && new Date(`${application.deadline}T23:59:59`).getTime() >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit)
    .map((application) => {
      const days = daysBetween(asOf, `${application.deadline}T23:59:59`);
      return { id: application.id, company: application.company, role: application.role, deadline: application.deadline, status: application.status, urgency: days <= 3 ? "High" : days <= 7 ? "Medium" : "Low" };
    });
}

export function recruitingPlan(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData, asOf: string): RecruitingPlanItem[] {
  const recentApplications = applications.filter((application) => isRecent(application.createdAt, asOf, 7));
  const stale = applications.filter((application) => !["Offer", "Rejected", "Wishlist"].includes(application.status) && daysBetween(application.updatedAt, asOf) >= 7);
  const hasOa = applications.some((application) => application.status === "OA");
  const hasInterview = applications.some((application) => ["Interview", "Final Round"].includes(application.status));
  const codingDoneToday = prep.sessions.some((session) => session.type === "coding" && sameDay(session.completedAt, asOf));
  const items: RecruitingPlanItem[] = [];

  if (!resumes.length) items.push({ id: "resume", label: "Upload your first resume", detail: "Create a targeted version before applying.", priority: "High", complete: false });
  if (recentApplications.length < 3) items.push({ id: "apply", label: `Add ${3 - recentApplications.length} targeted application${3 - recentApplications.length === 1 ? "" : "s"}`, detail: "Build this week's pipeline with roles that match an active resume.", priority: "High", complete: false });
  if (hasOa) items.push({ id: "oa", label: "Complete one timed coding problem", detail: "An active OA makes interview-speed practice the highest-value prep block.", priority: "High", complete: codingDoneToday });
  if (hasInterview) items.push({ id: "interview", label: "Rehearse one STAR story and one design prompt", detail: "Prepare concise examples for active interview loops.", priority: "Today", complete: false });
  if (stale.length) items.push({ id: "followup", label: `Follow up on ${Math.min(stale.length, 3)} stale application${stale.length === 1 ? "" : "s"}`, detail: `Start with ${stale[0].company}; it has had no movement for at least a week.`, priority: "Today", complete: false });
  if (!items.length) items.push({ id: "maintain", label: "Review your next deadline", detail: "Your pipeline is moving; protect the nearest commitment.", priority: "Next", complete: false });
  return items.slice(0, 5);
}

export function recentActivity(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData, asOf: string, limit = 7): Activity[] {
  const entries: Array<Activity & { timestamp: string }> = [];
  for (const application of applications) {
    const created = isSameMoment(application.createdAt, application.updatedAt);
    entries.push({ id: `application-${application.id}`, label: `${created ? "Added" : "Updated"} ${application.company}`, detail: `${application.role} · ${application.status}`, time: relativeTime(application.updatedAt, asOf), tone: created ? "info" : "warning", timestamp: application.updatedAt });
  }
  for (const resume of resumes) {
    const created = isSameMoment(resume.createdAt, resume.updatedAt);
    entries.push({ id: `resume-${resume.id}`, label: `${created ? "Created" : "Updated"} ${resume.name}`, detail: `${resume.targetRole} · ${resume.keywordMatchScore}% keyword match`, time: relativeTime(resume.updatedAt, asOf), tone: "success", timestamp: resume.updatedAt });
  }
  for (const problem of prep.codingProblems.filter((item) => item.completedAt)) entries.push({ id: `coding-${problem.id}`, label: `Completed ${problem.title}`, detail: `${problem.topic} · ${problem.difficulty}`, time: relativeTime(problem.completedAt, asOf), tone: "success", timestamp: problem.completedAt });
  for (const question of prep.behavioralQuestions) entries.push({ id: `behavioral-${question.id}`, label: "Updated behavioral answer", detail: `${question.category} · confidence ${question.confidenceScore}/5`, time: relativeTime(question.updatedAt, asOf), tone: "info", timestamp: question.updatedAt });
  for (const prompt of prep.systemDesignPrompts) entries.push({ id: `system-${prompt.id}`, label: `${prompt.status === "Completed" ? "Completed" : "Updated"} ${prompt.title}`, detail: prompt.concepts.slice(0, 3).join(", ") || "System design practice", time: relativeTime(prompt.updatedAt, asOf), tone: prompt.status === "Completed" ? "success" : "info", timestamp: prompt.updatedAt });
  return entries.sort((a, b) => dateValue(b.timestamp) - dateValue(a.timestamp)).slice(0, limit).map(({ timestamp: _timestamp, ...entry }) => entry);
}

export function recruitingMomentum(applications: Application[], resumes: ResumeVersion[], prep: PrepWorkspaceData, asOf: string): MomentumSummary {
  const recentApps = applications.filter((application) => isRecent(application.createdAt, asOf, 7)).length;
  const prepDone = prep.sessions.filter((session) => isRecent(session.completedAt, asOf, 7)).length;
  const active = applications.filter((application) => ["OA", "Interview", "Final Round"].includes(application.status)).length;
  const resumeUpdates = resumes.filter((resume) => isRecent(resume.updatedAt, asOf, 7)).length;
  const score = Math.min(100, recentApps * 10 + prepDone * 6 + active * 12 + resumeUpdates * 5);
  const label = score >= 70 ? "Strong momentum" : score >= 40 ? "Building momentum" : "Momentum needs attention";
  const dailyValues = prep.weeklyDays.map((day) => Math.min(100, (day.coding + day.behavioral + day.systemDesign) * 28 + 12));
  return { score, label, explanation: `${recentApps} application${recentApps === 1 ? "" : "s"} added and ${prepDone} prep task${prepDone === 1 ? "" : "s"} completed this week, with ${active} active OA/interview signal${active === 1 ? "" : "s"}.`, applicationsThisWeek: recentApps, prepThisWeek: prepDone, activeSignals: active, resumeUpdates, dailyValues };
}

export function percent(value: number, total: number) { return total > 0 ? Math.round((value / total) * 100) : 0; }
export function isRecent(value: string, asOf: string, days: number) { const difference = dateValue(asOf) - dateValue(value); return difference >= 0 && difference <= days * 86_400_000; }
export function daysBetween(from: string, to: string) { return Math.max(0, Math.ceil((dateValue(to) - dateValue(from)) / 86_400_000)); }
function startOfDay(value: string) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date.getTime(); }
function sameDay(a: string, b: string) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function isSameMoment(a: string, b: string) { return Math.abs(dateValue(a) - dateValue(b)) < 60_000; }
function dateValue(value: string) { const time = new Date(value).getTime(); return Number.isFinite(time) ? time : 0; }
function relativeTime(value: string, asOf: string) { const days = Math.floor(Math.max(0, dateValue(asOf) - dateValue(value)) / 86_400_000); if (days === 0) return "Today"; if (days === 1) return "Yesterday"; if (days < 7) return `${days}d ago`; return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value)); }
