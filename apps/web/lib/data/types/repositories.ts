import type { Application, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import type {
  AnalyticsSummary,
  ApplicationInput,
  DashboardSummary,
  PrepCreateInput,
  PrepItem,
  PrepUpdateInput,
  ResumeInput,
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

export type LocalImportStatus = {
  available: boolean;
  applications: number;
  resumes: number;
  codingProblems: number;
  behavioralQuestions: number;
  systemDesignPrompts: number;
};

export interface WorkspaceRepository {
  populateDemo(): Promise<void>;
  clear(scope: WorkspaceScope): Promise<void>;
  clearWorkspace(): Promise<void>;
  getLocalImportStatus(): Promise<LocalImportStatus>;
  importLocalWorkspace(): Promise<LocalImportStatus>;
}
