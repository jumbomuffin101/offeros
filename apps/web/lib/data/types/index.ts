import type {
  Application,
  Activity,
  ApplicationStatus,
  BehavioralQuestion,
  CodingProblem,
  PrepGoal,
  PrepStatus,
  PrepWorkspaceData,
  ResumeVersion,
  ResumeAnalysis,
  SystemDesignPrompt,
} from "@/lib/types";
import type { AnalyticsModel } from "@/lib/analytics-utils";
import type {
  DashboardDeadline,
  MomentumSummary,
  RecruitingPlanItem,
} from "@/lib/dashboard-utils";

export type ApplicationInput = Omit<Application, "id" | "createdAt" | "updatedAt" | "category">;
export type ResumeInput = Omit<ResumeVersion, "id" | "createdAt" | "updatedAt" | "lastUpdated">;
export type ResumeAnalysisInput = {
  targetRole: string;
  companyName?: string;
  jobDescription: string;
  resumeText?: string;
};
export type ResumeAnalyzeResult = {
  analysis: ResumeAnalysis;
  resume: ResumeVersion;
};
export type ResumeUploadResult = {
  resume: ResumeVersion;
  extraction: {
    text: string;
    pageCount: number | null;
    characterCount: number;
    status: "completed" | "failed";
    warnings: string[];
  };
};
export type { ResumeAnalysis };
export type CodingProblemInput = Omit<CodingProblem, "id" | "completedAt" | "createdAt" | "updatedAt">;
export type SystemDesignInput = Omit<SystemDesignPrompt, "id" | "createdAt" | "updatedAt">;

export type PrepItem = CodingProblem | BehavioralQuestion | SystemDesignPrompt;
export type PrepItemType = "coding" | "behavioral" | "systemDesign";
export type PrepCreateInput =
  | { type: "coding"; value: CodingProblemInput }
  | { type: "behavioral"; value: Omit<BehavioralQuestion, "id" | "createdAt" | "updatedAt"> }
  | { type: "systemDesign"; value: SystemDesignInput };
export type PrepUpdateInput =
  | { type: "coding"; value: Partial<CodingProblemInput> }
  | { type: "behavioral"; value: Partial<BehavioralQuestion> }
  | { type: "systemDesign"; value: Partial<SystemDesignInput> };

export type DashboardSummary = {
  applications: Application[];
  resumes: ResumeVersion[];
  prep: PrepWorkspaceData;
  asOf: string;
  counts: Record<ApplicationStatus, number>;
  plan: RecruitingPlanItem[];
  momentum: MomentumSummary;
  prepValues: number[];
  applicationValues: number[];
  responseRate: number;
  prepStreak: number;
  weeklyPrepCompletion: number;
  deadlines: DashboardDeadline[];
  activities: Activity[];
  empty: boolean;
};

export type AnalyticsSummary = {
  analytics: AnalyticsModel;
  resumes: ResumeVersion[];
  empty: boolean;
  asOf: string;
};

export type PrepActions = {
  saveCoding: (input: CodingProblemInput, id?: string) => Promise<void>;
  setCodingStatus: (id: string, status: PrepStatus) => Promise<void>;
  saveBehavioral: (question: BehavioralQuestion) => Promise<void>;
  setBehavioralStatus: (id: string, status: PrepStatus) => Promise<void>;
  saveSystemDesign: (input: SystemDesignInput, id?: string) => Promise<void>;
  setSystemDesignStatus: (id: string, status: PrepStatus) => Promise<void>;
  saveGoals: (goals: PrepGoal[]) => Promise<void>;
};
