import type { Application, ApplicationCopilotConversation, ApplicationCopilotMessage, ApplicationEvent, ApplicationInbox, ApplicationStatus, AttentionCategory, GmailConnectionStatus, GmailSuggestion, MockInterviewSession, PrepWorkspaceData, ResumeAnalysis, ResumeVersion, UpcomingRecruitingEvent } from "@/lib/types";
import type {
  AnalyticsSummary,
  ApplicationInput,
  ApplicationAnalyzeResult,
  DashboardSummary,
  PrepCreateInput,
  PrepItem,
  PrepUpdateInput,
  ResumeInput,
  ResumeAnalysisInput,
  ResumeAnalyzeResult,
  ResumeUploadResult,
  MockInterviewAnswerResult,
  MockInterviewCreateInput,
  MockInterviewCreateResult,
} from "@/lib/data/types";

export interface ApplicationRepository {
  list(): Promise<Application[]>;
  get(id: string): Promise<Application | null>;
  create(input: ApplicationInput): Promise<Application>;
  update(id: string, input: Partial<ApplicationInput>): Promise<Application>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Application>;
  reset(): Promise<Application[]>;
  analyzeResume?(id: string, analysisRequestId?: string): Promise<ApplicationAnalyzeResult>;
}

export interface ApplicationEventRepository {
  list(applicationId: string): Promise<ApplicationEvent[]>;
  create(applicationId: string, input: Omit<ApplicationEvent, "id" | "applicationId" | "completedAt" | "externalCalendarEventId" | "createdAt" | "updatedAt">): Promise<ApplicationEvent>;
  update(id: string, input: Partial<ApplicationEvent>): Promise<ApplicationEvent>;
  delete(id: string): Promise<void>;
  addToCalendar(id: string): Promise<ApplicationEvent>;
  upcoming(): Promise<UpcomingRecruitingEvent[]>;
}

export interface ApplicationCopilotRepository {
  history(applicationId: string): Promise<ApplicationCopilotConversation>;
  send(applicationId: string, input: { message: string; conversationId?: string }): Promise<{ conversationId: string; message: ApplicationCopilotMessage }>;
  clear(applicationId: string, conversationId: string): Promise<void>;
}

export interface InboxRepository {
  list(): Promise<ApplicationInbox>;
  override(input: {
    applicationId: string;
    category: AttentionCategory;
    action: "dismiss" | "snooze";
    duration?: "tomorrow" | "3_days" | "1_week";
  }): Promise<ApplicationInbox>;
}

export interface GmailRepository {
  status(): Promise<GmailConnectionStatus>;
  connect(): Promise<{ authorizationUrl?: string; status?: GmailConnectionStatus }>;
  sync(): Promise<{ status: string; messagesScanned: number; candidatesFound: number; suggestionsCreated: number; duplicatesSkipped: number; lastSyncedAt?: string }>;
  suggestions(status?: string, applicationId?: string): Promise<GmailSuggestion[]>;
  accept(id: string, input: { applicationId: string; eventType: ApplicationEvent["eventType"]; eventAt: string; deadlineAt?: string; proposedStatus?: ApplicationStatus; applyStatus: boolean; recruiterName?: string; note: string }): Promise<GmailSuggestion>;
  reject(id: string): Promise<GmailSuggestion>;
  disconnect(deleteDerivedData: boolean): Promise<void>;
  deleteDerivedData(): Promise<void>;
}

export interface MockInterviewRepository {
  list(): Promise<MockInterviewSession[]>;
  get(id: string): Promise<MockInterviewSession | null>;
  plan(input: MockInterviewCreateInput): Promise<import("@/lib/data/types").MockInterviewPlanResult>;
  create(input: MockInterviewCreateInput): Promise<MockInterviewCreateResult>;
  answer(
    id: string,
    answer: string,
    answerRequestId: string,
  ): Promise<MockInterviewAnswerResult>;
  abandon(id: string): Promise<MockInterviewSession>;
}

export interface ResumeRepository {
  list(): Promise<ResumeVersion[]>;
  get(id: string): Promise<ResumeVersion | null>;
  create(input: ResumeInput): Promise<ResumeVersion>;
  update(id: string, input: Partial<ResumeInput>): Promise<ResumeVersion>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<ResumeVersion>;
  reset(): Promise<ResumeVersion[]>;
  updateResumeText(resumeId: string, text: string): Promise<ResumeVersion>;
  uploadResumeFile?(resumeId: string, file: File): Promise<ResumeUploadResult>;
  analyzeResume(resumeId: string, payload: ResumeAnalysisInput): Promise<ResumeAnalyzeResult>;
  listResumeAnalyses(resumeId: string): Promise<ResumeAnalysis[]>;
  getResumeAnalysis(id: string): Promise<ResumeAnalysis | null>;
  deleteResumeAnalysis(id: string): Promise<void>;
}

export interface PrepRepository {
  list(): Promise<PrepWorkspaceData>;
  get(id: string): Promise<PrepItem | null>;
  create(input: PrepCreateInput): Promise<PrepItem>;
  update(id: string, input: PrepUpdateInput): Promise<PrepItem>;
  delete(id: string): Promise<void>;
  replace(data: PrepWorkspaceData): Promise<PrepWorkspaceData>;
  reset(): Promise<PrepWorkspaceData>;
  evaluateBehavioral(storyId: string, input: { competencyFocus?: string; applicationId?: string }): Promise<{ evaluation: import("@/lib/types").BehavioralEvaluation; story: import("@/lib/types").BehavioralQuestion }>;
  listBehavioralEvaluations(storyId: string): Promise<import("@/lib/types").BehavioralEvaluation[]>;
  behavioralPortfolio(): Promise<import("@/lib/types").BehavioralPortfolio>;
  practiceBehavioral(input: { storyId?: string; applicationId?: string; competency: string; prompt: string; answer: string }): Promise<import("@/lib/types").BehavioralPracticeResult>;
}

export interface DashboardRepository {
  summary(): Promise<DashboardSummary>;
}

export interface AnalyticsRepository {
  summary(): Promise<AnalyticsSummary>;
}

export type WorkspaceScope = "all" | "applications" | "resumes" | "prep";
export type WorkspaceResetMode = "empty" | "sample";
export type WorkspaceResetResult = {
  scope: WorkspaceScope;
  mode: WorkspaceResetMode;
  deleted: {
    applications: number;
    resumes: number;
    resumeAnalyses: number;
    coding: number;
    behavioral: number;
    systemDesign: number;
  };
  created: {
    applications: number;
    resumes: number;
    coding: number;
    behavioral: number;
    systemDesign: number;
  };
};

export type LocalImportStatus = {
  available: boolean;
  applications: number;
  resumes: number;
  codingProblems: number;
  behavioralQuestions: number;
  systemDesignPrompts: number;
};

export interface WorkspaceRepository {
  reset(scope: WorkspaceScope, mode: WorkspaceResetMode): Promise<WorkspaceResetResult | void>;
  populateDemo(): Promise<void>;
  clear(scope: WorkspaceScope, mode?: WorkspaceResetMode): Promise<void>;
  clearWorkspace(): Promise<void>;
  getLocalImportStatus(): Promise<LocalImportStatus>;
  importLocalWorkspace(): Promise<LocalImportStatus>;
}
