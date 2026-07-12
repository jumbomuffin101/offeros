export type ApplicationStatus =
  | "Wishlist"
  | "Applying"
  | "Applied"
  | "OA"
  | "Interview"
  | "Final Round"
  | "Offer"
  | "Rejected";

export type ApplicationPriority = "Low" | "Medium" | "High";

export type Application = {
  id: string;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  dateApplied: string;
  deadline: string;
  source: string;
  resumeUsed: string;
  jobUrl: string;
  recruiterName: string;
  recruiterEmail: string;
  salaryRange: string;
  priority: ApplicationPriority;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: "Big Tech" | "Finance" | "Fintech" | "Startup" | "Data";
};

export type ResumeVersion = {
  id: string;
  name: string;
  targetRole: string;
  description: string;
  status: "Active" | "Draft";
  lastUpdated: string;
  applicationsUsed: number;
  keywordMatchScore: number;
  tags: string[];
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestedImprovement: string;
  notes: string;
  fileName: string;
  originalFileName: string;
  extractedText: string;
  textExtractionStatus: "not_started" | "manual" | "parsed" | "failed";
  textExtractionError: string;
  extractedAt?: string;
  extractionCharacterCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ResumeAnalysis = {
  id: string;
  resumeVersionId: string;
  companyName: string;
  targetRole: string;
  jobDescription: string;
  inputResumeHash: string;
  overallScore: number;
  keywordScore: number;
  impactScore: number;
  clarityScore: number;
  technicalDepthScore: number;
  experienceMatchScore: number;
  requiredSkillsMatch: Array<{ skill: string; status: "strong" | "partial" | "missing"; evidence: string | null }>;
  preferredSkillsMatch: Array<{ skill: string; status: "strong" | "partial" | "missing"; evidence: string | null }>;
  missingKeywords: string[];
  strongKeywords: string[];
  weakBullets: Array<{ original: string; issue: string; suggestion: string }>;
  suggestedBulletRewrites: Array<{ original: string; rewrite: string; whyBetter: string; groundedInResume?: boolean }>;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  recruiterSummary: string;
  summary: string;
  provider: string;
  model: string;
  status: "completed" | "failed" | "pending";
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Skipped";

export type CodingProblem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  targetTimeMinutes: number;
  status: PrepStatus;
  notes: string;
  link: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BehavioralQuestion = {
  id: string;
  question: string;
  category: string;
  starSituation: string;
  starTask: string;
  starAction: string;
  starResult: string;
  confidenceScore: number;
  status: PrepStatus;
  createdAt: string;
  updatedAt: string;
};

export type SystemDesignPrompt = {
  id: string;
  title: string;
  prompt: string;
  concepts: string[];
  status: PrepStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PrepSession = {
  id: string;
  itemId: string;
  type: "coding" | "behavioral" | "systemDesign";
  completedAt: string;
};

export type WeeklyPrepDay = {
  date: string;
  coding: number;
  behavioral: number;
  systemDesign: number;
};

export type PrepGoal = {
  id: "coding" | "behavioral" | "systemDesign" | "followUps";
  label: string;
  target: number;
  current: number;
};

export type PrepWorkspaceData = {
  codingProblems: CodingProblem[];
  behavioralQuestions: BehavioralQuestion[];
  systemDesignPrompts: SystemDesignPrompt[];
  sessions: PrepSession[];
  weeklyDays: WeeklyPrepDay[];
  goals: PrepGoal[];
};

export type Activity = {
  id: string;
  label: string;
  detail: string;
  time: string;
  tone: "info" | "success" | "warning" | "danger";
};

export type Deadline = {
  id: string;
  company: string;
  title: string;
  due: string;
  urgency: "Low" | "Medium" | "High";
};

export type AnalyticsMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  change: string;
  tone: "cyan" | "green" | "amber" | "red" | "purple";
};
