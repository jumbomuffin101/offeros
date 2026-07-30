import type {
  AIUsageSummary,
  OfferOSNotification,
  OfferOSSettings,
  TodaySummary,
} from "@/lib/types";
import { apiClient } from "@/lib/data/api/apiClient";
import { DataError } from "@/lib/data/errors";
import { fromApiAttentionItem } from "@/lib/data/repositories/apiInboxRepository";
import { applicationEventRepository as localEventRepository } from "@/lib/data/repositories/applicationEventRepository";
import { applicationRepository as localApplicationRepository } from "@/lib/data/repositories/applicationRepository";
import { inboxRepository as localInboxRepository } from "@/lib/data/repositories/inboxRepository";
import { mockInterviewRepository as localInterviewRepository } from "@/lib/data/repositories/mockInterviewRepository";
import { prepRepository as localPrepRepository } from "@/lib/data/repositories/prepRepository";
import { resumeRepository as localResumeRepository } from "@/lib/data/repositories/resumeRepository";
import { clearOfferOSStorage } from "@/lib/data/storage/local/preferencesStorage";

export type LaunchRepository = {
  settings(): Promise<OfferOSSettings>;
  updateSettings(input: Partial<OfferOSSettings>): Promise<OfferOSSettings>;
  today(): Promise<TodaySummary>;
  notifications(unreadOnly?: boolean): Promise<{ items: OfferOSNotification[]; unreadCount: number }>;
  markNotificationRead(id: string): Promise<OfferOSNotification>;
  markAllNotificationsRead(): Promise<void>;
  usage(): Promise<AIUsageSummary>;
  generatePrepPlan(applicationId: string): Promise<void>;
  exportData(): Promise<unknown>;
  deleteAccount(): Promise<void>;
};

type ApiEnvelope<T> = { data: T };
type ApiSettings = {
  theme: OfferOSSettings["theme"];
  notifications_enabled: boolean;
  onboarding_status: OfferOSSettings["onboardingStatus"];
  onboarding_step: number;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  first_resume_uploaded_at: string | null;
  first_application_created_at: string | null;
  first_analysis_completed_at: string | null;
  first_prep_plan_created_at: string | null;
  weekly_application_goal: number;
  weekly_coding_goal: number;
  weekly_mock_interview_goal: number;
  weekly_follow_up_goal: number;
  default_interview_difficulty: OfferOSSettings["defaultInterviewDifficulty"];
  default_mock_interview_length: number;
};
type ApiNotification = {
  id: string; type: string; title: string; message: string;
  application_id: string | null; action_url: string | null; action_label: string | null;
  read_at: string | null; expires_at: string | null; created_at: string;
};
type ApiToday = {
  generated_at: string;
  workspace_status: "ready" | "partial";
  date: string;
  top_action: null | {
    type: string; title: string; description: string; application_id: string | null;
    priority: number; action_label: string; action_url: string;
  };
  attention_items: Parameters<typeof fromApiAttentionItem>[0][];
  upcoming_events: Array<{
    id: string; application_id: string; company: string; role: string; event_type: string;
    title: string; scheduled_at: string; status: "upcoming" | "completed" | "canceled";
  }>;
  weekly_progress: {
    applications_added: number; coding_problems: number; mock_interviews: number;
    follow_ups_completed: number; prep_tasks: number; goals: Record<string, number>;
  };
  pipeline: Record<string, number>;
  recent_activity: Array<{ type: string; label: string; timestamp: string }>;
  resume_performance: { analyzed: number; total: number; best_resume: string | null; best_score: number | null };
  gmail: { status: string; pending_suggestions: number };
  notifications: { unread_count: number };
  sections: Record<string, string>;
  career_health: null | {
    status: "ready" | "insufficient_data"; overall_score: number | null;
    subscores: Record<string, number | null>; reason_codes: string[];
    positive_drivers: string[]; negative_drivers: string[]; data_sufficiency: number;
    recommended_actions: string[];
  };
  career_priorities: Array<{
    key: string; type: string; title: string; summary: string;
    priority: "urgent" | "high" | "medium" | "low"; action_label: string;
    action_route: string; confidence: number; reason_codes: string[];
  }>;
  improvement_signal: null | { direction: string; current_value: number | null; comparison_value: number | null };
  risk_signal: string | null;
};

const apiRepository: LaunchRepository = {
  async settings() {
    const response = await apiClient.get<ApiEnvelope<ApiSettings>>("/settings");
    return fromApiSettings(response.data);
  },
  async updateSettings(input) {
    const response = await apiClient.patch<ApiEnvelope<ApiSettings>>("/settings", toApiSettings(input));
    return fromApiSettings(response.data);
  },
  async today() {
    const response = await apiClient.get<ApiEnvelope<ApiToday>>("/dashboard/today");
    assertApiToday(response);
    return fromApiToday(response.data);
  },
  async notifications(unreadOnly = false) {
    const response = await apiClient.get<ApiEnvelope<{ items: ApiNotification[]; unread_count: number }>>(
      `/notifications${unreadOnly ? "?unread_only=true" : ""}`,
    );
    return { items: response.data.items.map(fromApiNotification), unreadCount: response.data.unread_count };
  },
  async markNotificationRead(id) {
    const response = await apiClient.patch<ApiEnvelope<ApiNotification>>(`/notifications/${id}/read`, {});
    return fromApiNotification(response.data);
  },
  async markAllNotificationsRead() {
    await apiClient.post("/notifications/read-all", {});
  },
  async usage() {
    const response = await apiClient.get<ApiEnvelope<{ operations: Array<{ operation: string; used: number; limit: number; resets_at: string }> }>>("/account/usage");
    return { operations: response.data.operations.map((item) => ({ ...item, resetsAt: item.resets_at })) };
  },
  async generatePrepPlan(applicationId) {
    await apiClient.post(`/applications/${applicationId}/prep-plan/generate`, {});
  },
  exportData() {
    return apiClient.get("/account/export");
  },
  deleteAccount() {
    return apiClient.post("/account/delete", { confirmation: "DELETE" });
  },
};

const LOCAL_STATE_KEY = "offeros:launch-state";
type LocalState = {
  settings: OfferOSSettings;
  notifications: OfferOSNotification[];
};
const defaultSettings: OfferOSSettings = {
  theme: "dark",
  notificationsEnabled: true,
  onboardingStatus: "not_started",
  onboardingStep: 1,
  weeklyApplicationGoal: 5,
  weeklyCodingGoal: 5,
  weeklyMockInterviewGoal: 2,
  weeklyFollowUpGoal: 3,
  defaultInterviewDifficulty: "standard",
  defaultMockInterviewLength: 5,
};

const localRepository: LaunchRepository = {
  async settings() {
    const state = readLocalState();
    if (state.settings.onboardingStatus === "not_started") {
      const [applications, resumes] = await Promise.all([
        localApplicationRepository.list(),
        localResumeRepository.list(),
      ]);
      if (applications.length || resumes.length) {
        state.settings = {
          ...state.settings,
          onboardingStatus: "completed",
          onboardingStep: 6,
          onboardingCompletedAt: new Date().toISOString(),
        };
        writeLocalState(state);
      }
    }
    return state.settings;
  },
  async updateSettings(input) {
    const state = readLocalState();
    state.settings = { ...state.settings, ...input };
    writeLocalState(state);
    return state.settings;
  },
  async today() {
    const [applications, resumes, prep, inbox, events, interviews] = await Promise.all([
      localApplicationRepository.list(),
      localResumeRepository.list(),
      localPrepRepository.list(),
      localInboxRepository.list(),
      localEventRepository.upcoming(),
      localInterviewRepository.list(),
    ]);
    const settings = (await localRepository.settings());
    const weekAgo = Date.now() - 7 * 86_400_000;
    const completedPrep = prep.sessions.filter((item) => new Date(item.completedAt).getTime() >= weekAgo);
    const completedInterviews = interviews.filter((item) => item.status === "completed" && new Date(item.completedAt || item.updatedAt).getTime() >= weekAgo);
    const analyzed = resumes.filter((item) => item.latestAnalysisId || item.analysisStatus === "completed");
    const best = [...analyzed].sort((a, b) => (b.latestOverallScore || 0) - (a.latestOverallScore || 0))[0];
    const pipeline = { saved: 0, applied: 0, oa: 0, interview: 0, offer: 0 };
    for (const item of applications) {
      if (item.status === "Wishlist" || item.status === "Applying") pipeline.saved += 1;
      else if (item.status === "Applied") pipeline.applied += 1;
      else if (item.status === "OA") pipeline.oa += 1;
      else if (item.status === "Interview" || item.status === "Final Round") pipeline.interview += 1;
      else if (item.status === "Offer") pipeline.offer += 1;
    }
    const attention = inbox.items.slice(0, 5);
    reconcileLocalAttentionNotifications(attention);
    const top = attention[0];
    return {
      generatedAt: new Date().toISOString(),
      workspaceStatus: "ready",
      date: new Date().toISOString().slice(0, 10),
      topAction: top ? {
        type: top.category, title: top.title, description: `${top.company} - ${top.role}. ${top.description}`,
        applicationId: top.applicationId, priority: top.priority, actionLabel: top.suggestedAction,
        actionUrl: `/applications?application=${top.applicationId}`,
      } : !resumes.length ? {
        type: "upload_resume", title: "Upload your first resume", description: "Create a resume version to unlock targeted analysis.",
        priority: 30, actionLabel: "Add resume", actionUrl: "/resumes?action=add",
      } : !applications.length ? {
        type: "add_application", title: "Add your first application", description: "Track a target role to organize deadlines and next actions.",
        priority: 25, actionLabel: "Add application", actionUrl: "/applications?action=add",
      } : undefined,
      attentionItems: attention,
      upcomingEvents: events.slice(0, 8),
      weeklyProgress: {
        applicationsAdded: applications.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length,
        codingProblems: completedPrep.filter((item) => item.type === "coding").length,
        mockInterviews: completedInterviews.length,
        followUpsCompleted: 0,
        prepTasks: completedPrep.length,
        goals: {
          applications: settings.weeklyApplicationGoal, coding: settings.weeklyCodingGoal,
          mock_interviews: settings.weeklyMockInterviewGoal, follow_ups: settings.weeklyFollowUpGoal,
        },
      },
      pipeline,
      recentActivity: [],
      resumePerformance: { analyzed: analyzed.length, total: resumes.length, bestResume: best?.name, bestScore: best?.latestOverallScore },
      gmail: { status: "local_only", pendingSuggestions: 0 },
      notifications: { unreadCount: readLocalState().notifications.filter((item) => !item.readAt).length },
      sections: {
        core_workspace: "ready",
        smart_inbox: "ready",
        gmail: "local_only",
        notifications: "ready",
      },
      careerHealth: {
        status: applications.length || resumes.length || completedPrep.length ? "ready" : "insufficient_data",
        overallScore: applications.length || resumes.length || completedPrep.length ? 60 : undefined,
        subscores: {},
        reasonCodes: applications.length || resumes.length ? [] : ["INSUFFICIENT_HISTORY"],
        positiveDrivers: [],
        negativeDrivers: [],
        dataSufficiency: Math.min(1, (applications.length + resumes.length + completedPrep.length) / 10),
        recommendedActions: [],
      },
      careerPriorities: [],
    };
  },
  async notifications(unreadOnly = false) {
    const items = readLocalState().notifications
      .filter((item) => !unreadOnly || !item.readAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items, unreadCount: readLocalState().notifications.filter((item) => !item.readAt).length };
  },
  async markNotificationRead(id) {
    const state = readLocalState();
    const item = state.notifications.find((notification) => notification.id === id);
    if (!item) throw new Error("Notification was not found.");
    item.readAt = item.readAt || new Date().toISOString();
    writeLocalState(state);
    return item;
  },
  async markAllNotificationsRead() {
    const state = readLocalState();
    const now = new Date().toISOString();
    state.notifications = state.notifications.map((item) => ({ ...item, readAt: item.readAt || now }));
    writeLocalState(state);
  },
  async usage() {
    return { operations: [] };
  },
  async generatePrepPlan(applicationId) {
    const application = await localApplicationRepository.get(applicationId);
    if (!application) throw new Error("Application was not found.");
    await localPrepRepository.create({
      type: "coding",
      value: {
        title: `Role-specific practice for ${application.role}`,
        difficulty: "Medium",
        topic: "Role-specific fundamentals",
        targetTimeMinutes: 35,
        status: "Not Started",
        notes: `Local prep starter for ${application.company} - ${application.role}. Review the job description and focus on its core technical requirements.`,
        link: "",
      },
    });
  },
  async exportData() {
    const exportData: Record<string, unknown> = { format: "offeros-local-export-v1" };
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("offeros:")) exportData[key] = parseLocal(localStorage.getItem(key));
    }
    return exportData;
  },
  async deleteAccount() {
    clearOfferOSStorage();
  },
};

export const launchRepository: LaunchRepository =
  process.env.NEXT_PUBLIC_DATA_MODE === "api" ? apiRepository : localRepository;

function fromApiSettings(value: ApiSettings): OfferOSSettings {
  return {
    theme: value.theme,
    notificationsEnabled: value.notifications_enabled,
    onboardingStatus: value.onboarding_status,
    onboardingStep: value.onboarding_step,
    onboardingCompletedAt: value.onboarding_completed_at ?? undefined,
    onboardingSkippedAt: value.onboarding_skipped_at ?? undefined,
    firstResumeUploadedAt: value.first_resume_uploaded_at ?? undefined,
    firstApplicationCreatedAt: value.first_application_created_at ?? undefined,
    firstAnalysisCompletedAt: value.first_analysis_completed_at ?? undefined,
    firstPrepPlanCreatedAt: value.first_prep_plan_created_at ?? undefined,
    weeklyApplicationGoal: value.weekly_application_goal,
    weeklyCodingGoal: value.weekly_coding_goal,
    weeklyMockInterviewGoal: value.weekly_mock_interview_goal,
    weeklyFollowUpGoal: value.weekly_follow_up_goal,
    defaultInterviewDifficulty: value.default_interview_difficulty,
    defaultMockInterviewLength: value.default_mock_interview_length,
  };
}
function toApiSettings(value: Partial<OfferOSSettings>) {
  const result: Record<string, unknown> = {};
  const mapping: Record<string, string> = {
    theme: "theme", notificationsEnabled: "notifications_enabled", onboardingStatus: "onboarding_status",
    onboardingStep: "onboarding_step", weeklyApplicationGoal: "weekly_application_goal",
    weeklyCodingGoal: "weekly_coding_goal", weeklyMockInterviewGoal: "weekly_mock_interview_goal",
    weeklyFollowUpGoal: "weekly_follow_up_goal", defaultInterviewDifficulty: "default_interview_difficulty",
    defaultMockInterviewLength: "default_mock_interview_length",
  };
  for (const [key, apiKey] of Object.entries(mapping)) {
    if (key in value) result[apiKey] = value[key as keyof OfferOSSettings];
  }
  return result;
}
function fromApiNotification(value: ApiNotification): OfferOSNotification {
  return {
    id: value.id, type: value.type, title: value.title, message: value.message,
    applicationId: value.application_id ?? undefined, actionUrl: value.action_url ?? undefined,
    actionLabel: value.action_label ?? undefined, readAt: value.read_at ?? undefined,
    expiresAt: value.expires_at ?? undefined, createdAt: value.created_at,
  };
}
function fromApiToday(value: ApiToday): TodaySummary {
  return {
    generatedAt: value.generated_at,
    workspaceStatus: value.workspace_status,
    date: value.date,
    topAction: value.top_action ? {
      type: value.top_action.type, title: value.top_action.title, description: value.top_action.description,
      applicationId: value.top_action.application_id ?? undefined, priority: value.top_action.priority,
      actionLabel: value.top_action.action_label, actionUrl: value.top_action.action_url,
    } : undefined,
    attentionItems: value.attention_items.map(fromApiAttentionItem),
    upcomingEvents: value.upcoming_events.map((item) => ({
      id: item.id, applicationId: item.application_id, company: item.company, role: item.role,
      eventType: item.event_type as never, title: item.title, description: "", scheduledAt: item.scheduled_at,
      completedAt: "", status: item.status, source: "application", externalCalendarEventId: "",
      createdAt: item.scheduled_at, updatedAt: item.scheduled_at,
    })),
    weeklyProgress: {
      applicationsAdded: value.weekly_progress.applications_added,
      codingProblems: value.weekly_progress.coding_problems,
      mockInterviews: value.weekly_progress.mock_interviews,
      followUpsCompleted: value.weekly_progress.follow_ups_completed,
      prepTasks: value.weekly_progress.prep_tasks,
      goals: value.weekly_progress.goals,
    },
    pipeline: value.pipeline,
    recentActivity: value.recent_activity.map((item, index) => ({
      id: `${item.type}-${item.timestamp}-${index}`, label: item.label, detail: item.type.replaceAll("_", " "),
      time: relativeActivityTime(item.timestamp), tone: "info",
    })),
    resumePerformance: {
      analyzed: value.resume_performance.analyzed, total: value.resume_performance.total,
      bestResume: value.resume_performance.best_resume ?? undefined,
      bestScore: value.resume_performance.best_score ?? undefined,
    },
    gmail: {
      status: value.gmail.status,
      pendingSuggestions: value.gmail.pending_suggestions,
    },
    notifications: { unreadCount: value.notifications.unread_count },
    sections: value.sections,
    careerHealth: value.career_health ? {
      status: value.career_health.status,
      overallScore: value.career_health.overall_score ?? undefined,
      subscores: Object.fromEntries(Object.entries(value.career_health.subscores).map(([key, score]) => [key, score ?? undefined])),
      reasonCodes: value.career_health.reason_codes,
      positiveDrivers: value.career_health.positive_drivers,
      negativeDrivers: value.career_health.negative_drivers,
      dataSufficiency: value.career_health.data_sufficiency,
      recommendedActions: value.career_health.recommended_actions,
    } : undefined,
    careerPriorities: value.career_priorities.map((item) => ({
      key: item.key, type: item.type, title: item.title, summary: item.summary,
      priority: item.priority, actionLabel: item.action_label, actionRoute: item.action_route,
      confidence: item.confidence, reasonCodes: item.reason_codes,
    })),
    improvementSignal: value.improvement_signal ? {
      direction: value.improvement_signal.direction,
      currentValue: value.improvement_signal.current_value ?? undefined,
      comparisonValue: value.improvement_signal.comparison_value ?? undefined,
    } : undefined,
    riskSignal: value.risk_signal ?? undefined,
  };
}
function assertApiToday(value: unknown): asserts value is ApiEnvelope<ApiToday> {
  if (!value || typeof value !== "object" || !("data" in value)) throw malformedToday();
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== "object") throw malformedToday();
  const summary = data as Partial<ApiToday>;
  if (
    typeof summary.generated_at !== "string"
    || (summary.workspace_status !== "ready" && summary.workspace_status !== "partial")
    || typeof summary.date !== "string"
    || !Array.isArray(summary.attention_items)
    || !Array.isArray(summary.upcoming_events)
    || !summary.weekly_progress
    || !summary.pipeline
    || !Array.isArray(summary.recent_activity)
    || !summary.resume_performance
    || !summary.gmail
    || !summary.notifications
    || !summary.sections
    || !Array.isArray(summary.career_priorities)
  ) {
    throw malformedToday();
  }
}
function malformedToday() {
  return new DataError(
    "API_ERROR",
    "OfferOS received an incomplete Today summary. Retry after the workspace finishes starting.",
  );
}
function readLocalState(): LocalState {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) || "{}") as Partial<LocalState>;
    return {
      settings: { ...defaultSettings, ...parsed.settings },
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch {
    return { settings: defaultSettings, notifications: [] };
  }
}
function writeLocalState(value: LocalState) {
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(value));
}
function reconcileLocalAttentionNotifications(
  items: Awaited<ReturnType<typeof localInboxRepository.list>>["items"],
) {
  const state = readLocalState();
  const existingKeys = new Set(state.notifications.map((item) => `${item.type}:${item.applicationId ?? ""}`));
  let changed = false;
  for (const item of items) {
    const notificationType = item.category === "follow_up_due"
      ? "follow_up_due"
      : ["oa_deadline_soon", "interview_soon", "offer_deadline_soon"].includes(item.category)
        ? "deadline_approaching"
        : null;
    if (!notificationType) continue;
    const key = `${notificationType}:${item.applicationId}`;
    if (existingKeys.has(key)) continue;
    state.notifications.push({
      id: `notification-${item.applicationId}-${item.category}`,
      type: notificationType,
      title: item.title,
      message: item.description,
      applicationId: item.applicationId,
      actionUrl: `/applications?application=${item.applicationId}`,
      actionLabel: item.suggestedAction || "Open application",
      createdAt: new Date().toISOString(),
    });
    existingKeys.add(key);
    changed = true;
  }
  if (changed) writeLocalState(state);
}
function relativeActivityTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h`;
  if (minutes < 10_080) return `${Math.round(minutes / 1_440)}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}
function parseLocal(value: string | null) {
  if (value === null) return null;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}
