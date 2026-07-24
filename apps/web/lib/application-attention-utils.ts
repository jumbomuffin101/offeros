import type {
  Application,
  ApplicationAttentionItem,
  ApplicationEvent,
  ApplicationInbox,
  AttentionCategory,
  PrepWorkspaceData,
} from "@/lib/types";

export const ATTENTION_THRESHOLDS = {
  appliedFollowUpDays: 10,
  interviewFollowUpDays: 3,
  staleDays: 21,
  eventWindowHours: 72,
  offerWindowHours: 48,
  lowPrepReadiness: 60,
} as const;

const activeStatuses = new Set(["Applying", "Applied", "OA", "Interview", "Final Round"]);
const interviewTypes = new Set(["recruiter_screen", "technical_interview", "behavioral_interview", "system_design_interview", "final_round"]);
const meaningfulTypes = new Set(["applied", "oa_received", "oa_deadline", "oa_completed", ...interviewTypes, "follow_up", "offer_received", "offer_deadline", "rejected", "withdrawn"]);

export type LocalAttentionOverride = {
  applicationId: string;
  category: AttentionCategory;
  signalKey: string;
  dismissedUntil: string | null;
};

export function buildLocalInbox(
  applications: Application[],
  events: ApplicationEvent[],
  prep: PrepWorkspaceData,
  overrides: LocalAttentionOverride[],
  now = new Date(),
): ApplicationInbox {
  const overrideMap = new Map(overrides.map((override) => [`${override.applicationId}:${override.category}`, override]));
  const readiness = localPrepReadiness(prep);
  const items = applications.flatMap((application) =>
    applicationItems(application, events.filter((event) => event.applicationId === application.id), readiness, now),
  ).filter((item) => {
    const override = overrideMap.get(`${item.applicationId}:${item.category}`);
    if (!override || override.signalKey !== signalKey(item)) return true;
    return Boolean(override.dismissedUntil && new Date(override.dismissedUntil).getTime() <= now.getTime());
  }).sort((a, b) => b.priority - a.priority || dateValue(a.dueAt) - dateValue(b.dueAt) || a.company.localeCompare(b.company));
  return {
    items,
    summary: {
      critical: items.filter((item) => item.priority >= 90).length,
      high: items.filter((item) => item.priority >= 60 && item.priority < 90).length,
      medium: items.filter((item) => item.priority < 60).length,
      total: items.length,
    },
  };
}

export function signalKey(item: ApplicationAttentionItem) {
  return hash(`${item.id}|${item.lastMeaningfulActivity}|${item.dueAt}|${item.description}`);
}

function applicationItems(
  application: Application,
  events: ApplicationEvent[],
  prepReadiness: number,
  now: Date,
) {
  const items: ApplicationAttentionItem[] = [];
  const lastActivity = lastMeaningfulActivity(application, events, now);
  const daysSinceUpdate = daysBetween(lastActivity.at, now);
  const followUpCount = events.filter((event) => event.eventType === "follow_up").length;
  const timingMetrics = attentionTimingMetrics(application, events);
  const upcoming = events.filter((event) => event.status === "upcoming");
  const oaDeadline = relevantEvent(upcoming.filter((event) => event.eventType === "oa_deadline"), now, 72);
  const interview = relevantEvent(upcoming.filter((event) => interviewTypes.has(event.eventType)), now, 72);
  const offerDeadline = relevantEvent(upcoming.filter((event) => event.eventType === "offer_deadline"), now, 48);
  const add = (
    category: AttentionCategory,
    priority: number,
    title: string,
    description: string,
    suggestedAction: string,
    event?: ApplicationEvent,
  ) => items.push({
    id: `${application.id}:${category}`,
    applicationId: application.id,
    company: application.company,
    role: application.role,
    category,
    priority,
    title,
    description,
    dueAt: event?.scheduledAt ?? "",
    createdAt: lastActivity.at.toISOString(),
    suggestedAction,
    lastMeaningfulActivity: lastActivity.at.toISOString(),
    daysSinceUpdate,
    followUpCount,
    ...timingMetrics,
  });

  if (oaDeadline && activeStatuses.has(application.status)) {
    const hours = hoursUntil(oaDeadline.scheduledAt, now);
    add("oa_deadline_soon", hours < 0 ? 100 : hours <= 24 ? 90 : 75, "Online assessment deadline", deadlineDescription("OA", hours), "Open prep", oaDeadline);
  }
  if (interview && activeStatuses.has(application.status)) {
    const hours = hoursUntil(interview.scheduledAt, now);
    add("interview_soon", hours < 0 ? 100 : hours <= 24 ? 85 : 80, interview.title, deadlineDescription("Interview", hours), "Open prep plan", interview);
  }
  if (offerDeadline) {
    const hours = hoursUntil(offerDeadline.scheduledAt, now);
    add("offer_deadline_soon", hours < 0 ? 100 : hours <= 24 ? 95 : 85, "Offer decision deadline", deadlineDescription("Offer deadline", hours), "Open application", offerDeadline);
  }
  if (application.status === "Applied" && application.dateApplied) {
    const appliedAt = new Date(`${application.dateApplied}T00:00:00`);
    const newerMeaningfulEvent = events.some((event) => event.eventType !== "applied" && meaningfulTypes.has(event.eventType) && eventActivity(event) > appliedAt.getTime());
    const daysApplied = daysBetween(appliedAt, now);
    if (daysApplied >= ATTENTION_THRESHOLDS.appliedFollowUpDays && !newerMeaningfulEvent) {
      add("follow_up_due", 60, "Follow-up due", `Applied ${daysApplied} days ago with no newer recruiting activity.`, "Draft follow-up");
    }
  }
  if (application.status === "Interview") {
    const completed = events.filter((event) => interviewTypes.has(event.eventType) && event.status === "completed").sort((a, b) => eventActivity(b) - eventActivity(a))[0];
    if (completed) {
      const completedAt = new Date(eventActivity(completed));
      const days = daysBetween(completedAt, now);
      const newer = events.some((event) => event.id !== completed.id && meaningfulTypes.has(event.eventType) && eventActivity(event) > completedAt.getTime());
      if (days >= ATTENTION_THRESHOLDS.interviewFollowUpDays && !newer && !items.some((item) => item.category === "follow_up_due")) {
        add("follow_up_due", 60, "Interview follow-up due", `${completed.title} was ${days} days ago.`, "Draft follow-up", completed);
      }
    }
  }
  if (activeStatuses.has(application.status)) {
    if (!application.resumeVersionId) add("missing_resume", 40, "Select a resume", "This active application has no targeted resume selected.", "Select resume");
    if (!application.jobDescription?.trim()) add("missing_job_description", 40, "Add the job description", "OfferOS needs the role requirements for targeted analysis and prep.", "Add job description");
    if (application.resumeVersionId && application.jobDescription?.trim() && !application.resumeAnalysisId) add("needs_resume_analysis", 45, "Analyze resume fit", "Resume and job description are ready for role-specific analysis.", "Analyze resume");
    if (["OA", "Interview", "Final Round"].includes(application.status)) add("needs_prep_plan", 50, "Generate an interview prep plan", "This active interview stage needs a targeted prep plan.", "Generate prep plan");
    if (interview && prepReadiness < ATTENTION_THRESHOLDS.lowPrepReadiness) add("low_prep_readiness", 70, "Prep readiness needs attention", `Interview is within 72 hours and workspace prep readiness is ${prepReadiness}%.`, "Open prep plan", interview);
    if (daysSinceUpdate >= ATTENTION_THRESHOLDS.staleDays) add("stale_application", 30, "Application is stale", `No meaningful recruiting progress for ${daysSinceUpdate} days. Last activity: ${lastActivity.label}.`, "Review application");
  }
  return items;
}

function lastMeaningfulActivity(application: Application, events: ApplicationEvent[], now: Date) {
  const candidates = [
    { at: new Date(application.createdAt), label: "Application created" },
    { at: new Date(application.meaningfulUpdatedAt || application.createdAt), label: "Status updated" },
  ];
  if (application.dateApplied) candidates.push({ at: new Date(`${application.dateApplied}T00:00:00`), label: "Application submitted" });
  for (const event of events) {
    const at = new Date(event.completedAt || event.scheduledAt);
    if (meaningfulTypes.has(event.eventType) && at <= now) candidates.push({ at, label: event.title });
  }
  return candidates.sort((a, b) => b.at.getTime() - a.at.getTime())[0];
}

function relevantEvent(events: ApplicationEvent[], now: Date, windowHours: number) {
  const candidates = events.filter((event) => hoursUntil(event.scheduledAt, now) <= windowHours);
  const overdue = candidates.filter((event) => hoursUntil(event.scheduledAt, now) < 0);
  return overdue.sort((a, b) => dateValue(b.scheduledAt) - dateValue(a.scheduledAt))[0]
    ?? candidates.sort((a, b) => dateValue(a.scheduledAt) - dateValue(b.scheduledAt))[0];
}

function localPrepReadiness(prep: PrepWorkspaceData) {
  const items = [...prep.codingProblems, ...prep.behavioralQuestions, ...prep.systemDesignPrompts];
  return items.length ? Math.round(items.filter((item) => item.status === "Completed").length / items.length * 100) : 0;
}

function deadlineDescription(label: string, hours: number) {
  if (hours < 0) return `${label} is overdue.`;
  if (hours <= 24) return `${label} is due within 24 hours.`;
  return `${label} is due within ${Math.max(2, Math.round(hours / 24))} days.`;
}

function eventActivity(event: ApplicationEvent) { return dateValue(event.completedAt || event.scheduledAt); }
function attentionTimingMetrics(application: Application, events: ApplicationEvent[]) {
  const appliedAt = application.dateApplied
    ? dateValue(`${application.dateApplied}T00:00:00`)
    : dateValue(application.createdAt);
  const responseTypes = new Set(["oa_received", "oa_completed", ...interviewTypes, "offer_received", "rejected"]);
  const responseTimes = events
    .filter((event) => responseTypes.has(event.eventType) && eventActivity(event) >= appliedAt)
    .map(eventActivity);
  const interviews = events
    .filter((event) => interviewTypes.has(event.eventType) && (event.status === "completed" || Boolean(event.completedAt)))
    .map(eventActivity);
  const outcomes = events
    .filter((event) => ["offer_received", "rejected"].includes(event.eventType))
    .map(eventActivity);
  const outcomeDurations = interviews.flatMap((interviewAt) =>
    outcomes
      .filter((outcomeAt) => outcomeAt >= interviewAt)
      .map((outcomeAt) => Math.floor((outcomeAt - interviewAt) / 86_400_000)),
  );
  return {
    daysToFirstResponse: responseTimes.length
      ? Math.max(0, Math.floor((Math.min(...responseTimes) - appliedAt) / 86_400_000))
      : undefined,
    daysFromInterviewToOutcome: outcomeDurations.length
      ? Math.min(...outcomeDurations)
      : undefined,
  };
}
function hoursUntil(value: string, now: Date) { return (dateValue(value) - now.getTime()) / 3_600_000; }
function daysBetween(from: Date, to: Date) { return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000)); }
function dateValue(value: string) { const result = new Date(value).getTime(); return Number.isFinite(result) ? result : Number.POSITIVE_INFINITY; }
function hash(value: string) { let result = 2166136261; for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619); return (result >>> 0).toString(16); }
