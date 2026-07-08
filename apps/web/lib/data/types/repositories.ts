import type { Application, PrepWorkspaceData, ResumeAnalysis, ResumeVersion } from "@/lib/types";
import type {
  AnalyticsSummary,
  ApplicationInput,
  DashboardSummary,
  PrepCreateInput,
  PrepItem,
  PrepUpdateInput,
  ResumeInput,
  ResumeAnalysisInput,
} from "@/lib/data/types";

export interface ApplicationRepository {
  list(): Promise<Application[]>;
  get(id: string): Promise<Application | null>;
  create(input: ApplicationInput): Promise<Application>;
  update(id: string, input: Partial<ApplicationInput>): Promise<Application>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Application>;
  reset(): Promise<Application[]>;
}

export interface ResumeRepository {
  list(): Promise<ResumeVersion[]>;
  get(id: string): Promise<ResumeVersion | null>;
  create(input: ResumeInput): Promise<ResumeVersion>;
  update(id: string, input: Partial<ResumeInput>): Promise<ResumeVersion>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<ResumeVersion>;
  reset(): Promise<ResumeVersion[]>;
  analyzeResume(resumeId: string, payload: ResumeAnalysisInput): Promise<ResumeAnalysis>;
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
    coding: number;
    behavioral: number;
    systemDesign: number;
    analyses: number;
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
