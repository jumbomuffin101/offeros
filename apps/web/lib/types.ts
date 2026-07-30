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
  externalJobId?: string;
  capturedAt?: string;
  nextAction?: string;
  nextActionDueAt?: string;
  nextEventType?: string;
  resumeUsed: string;
  resumeVersionId?: string;
  resumeAnalysisId?: string;
  jobDescription?: string;
  selectedResumeName?: string;
  selectedResumeTargetRole?: string;
  analysisStatus?: "completed" | "failed" | "pending" | "";
  analysisOverallScore?: number;
  analysisKeywordScore?: number;
  analysisMissingKeywordCount?: number;
  analysisLastAnalyzedAt?: string;
  jobUrl: string;
  recruiterName: string;
  recruiterEmail: string;
  salaryRange: string;
  priority: ApplicationPriority;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  meaningfulUpdatedAt?: string;
  category: "Big Tech" | "Finance" | "Fintech" | "Startup" | "Data";
};

export type ApplicationEventType = "applied" | "oa_received" | "oa_deadline" | "oa_completed" | "recruiter_screen" | "technical_interview" | "behavioral_interview" | "system_design_interview" | "final_round" | "follow_up" | "offer_received" | "offer_deadline" | "rejected" | "withdrawn" | "custom";
export type ApplicationEvent = { id: string; applicationId: string; eventType: ApplicationEventType; title: string; description: string; scheduledAt: string; completedAt: string; status: "upcoming" | "completed" | "canceled"; source: "manual" | "application" | "calendar" | "future_email"; externalCalendarEventId: string; createdAt: string; updatedAt: string };
export type UpcomingRecruitingEvent = ApplicationEvent & { company: string; role: string };
export type AttentionCategory =
  | "follow_up_due"
  | "stale_application"
  | "missing_resume"
  | "missing_job_description"
  | "needs_resume_analysis"
  | "needs_prep_plan"
  | "oa_deadline_soon"
  | "interview_soon"
  | "offer_deadline_soon"
  | "low_prep_readiness"
  | "gmail_review";
export type ApplicationAttentionItem = {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  category: AttentionCategory;
  priority: number;
  title: string;
  description: string;
  dueAt: string;
  createdAt: string;
  suggestedAction: string;
  lastMeaningfulActivity: string;
  daysSinceUpdate: number;
  followUpCount: number;
  daysToFirstResponse?: number;
  daysFromInterviewToOutcome?: number;
};
export type ApplicationInbox = {
  items: ApplicationAttentionItem[];
  summary: { critical: number; high: number; medium: number; total: number };
};
export type GmailConnectionStatus = {
  enabled: boolean;
  connected: boolean;
  gmailAddress?: string;
  status: "connected" | "syncing" | "needs_reauthorization" | "error" | "disconnected";
  scope: string;
  lastSyncedAt?: string;
  initialSyncCompletedAt?: string;
  errorMessage?: string;
  simulated?: boolean;
};
export type GmailSuggestion = {
  id: string;
  applicationId?: string;
  acceptedEventId?: string;
  suggestionType: string;
  emailType: string;
  suggestedStatus?: string;
  suggestedEventType?: ApplicationEventType;
  suggestedEventAt?: string;
  suggestedDeadlineAt?: string;
  sourceTimezone?: string;
  dateIsAmbiguous: boolean;
  companyName?: string;
  roleTitle?: string;
  recruiterName?: string;
  confidence: number;
  evidence: string[];
  status: "pending" | "accepted" | "rejected" | "dismissed" | "expired";
  reviewedAt?: string;
  note: string;
  message: {
    senderEmail: string;
    senderName?: string;
    subject: string;
    snippet?: string;
    excerpt?: string;
    receivedAt: string;
  };
  createdAt: string;
};
export type MockInterviewType = "behavioral" | "resume" | "technical" | "system_design" | "mixed";
export type MockInterviewDifficulty = "introductory" | "standard" | "challenging";
export type MockInterviewStatus = "created" | "active" | "completed" | "abandoned" | "failed";
export type MockInterviewScores = {
  accuracy: number;
  relevance: number;
  clarity: number;
  depth: number;
  structure: number;
  ownership?: number;
  impact?: number;
  reflection?: number;
  collaboration?: number;
  requirements?: number;
  decomposition?: number;
  scalability?: number;
  reliability?: number;
  tradeoffs?: number;
};
export type MockInterviewEvaluation = {
  scores: MockInterviewScores;
  strengths: string[];
  weaknesses: string[];
  missedPoints: string[];
  followUpNeeded: boolean;
  followUpReason?: string;
  followUpQuestion?: string;
  summary: string;
};
export type MockInterviewTurn = {
  id: string;
  sessionId: string;
  turnIndex: number;
  speaker: "interviewer" | "candidate";
  content: string;
  questionType?: MockInterviewType;
  evaluation?: MockInterviewEvaluation;
  createdAt: string;
};
export type MockInterviewScorecard = {
  id: string;
  sessionId: string;
  communicationScore: number;
  technicalAccuracyScore: number;
  structureScore: number;
  depthScore: number;
  relevanceScore: number;
  behavioralScore?: number;
  resumeFluencyScore?: number;
  systemDesignScore?: number;
  technicalReasoningScore?: number;
  strengths: string[];
  weaknesses: string[];
  missedPoints: string[];
  strongestAnswer: string;
  weakestAnswer: string;
  recommendedActions: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
};
export type MockInterviewSession = {
  id: string;
  applicationId?: string;
  resumeVersionId?: string;
  interviewType: MockInterviewType;
  status: MockInterviewStatus;
  difficulty: MockInterviewDifficulty;
  title: string;
  targetRole: string;
  companyName: string;
  questionCount: number;
  currentQuestionIndex: number;
  contextSources: string[];
  startedAt: string;
  completedAt?: string;
  provider: string;
  model: string;
  overallScore?: number;
  createdAt: string;
  updatedAt: string;
  turns?: MockInterviewTurn[];
  scorecard?: MockInterviewScorecard;
};

export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type OfferOSSettings = {
  theme: "dark" | "light" | "system";
  notificationsEnabled: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  onboardingCompletedAt?: string;
  onboardingSkippedAt?: string;
  firstResumeUploadedAt?: string;
  firstApplicationCreatedAt?: string;
  firstAnalysisCompletedAt?: string;
  firstPrepPlanCreatedAt?: string;
  weeklyApplicationGoal: number;
  weeklyCodingGoal: number;
  weeklyMockInterviewGoal: number;
  weeklyFollowUpGoal: number;
  defaultInterviewDifficulty: MockInterviewDifficulty;
  defaultMockInterviewLength: number;
};
export type OfferOSNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  applicationId?: string;
  actionUrl?: string;
  actionLabel?: string;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
};
export type TodayTopAction = {
  type: string;
  title: string;
  description: string;
  applicationId?: string;
  priority: number;
  actionLabel: string;
  actionUrl: string;
};
export type TodaySummary = {
  generatedAt: string;
  workspaceStatus: "ready" | "partial";
  date: string;
  topAction?: TodayTopAction;
  attentionItems: ApplicationAttentionItem[];
  upcomingEvents: UpcomingRecruitingEvent[];
  weeklyProgress: {
    applicationsAdded: number;
    codingProblems: number;
    mockInterviews: number;
    followUpsCompleted: number;
    prepTasks: number;
    goals: Record<string, number>;
  };
  pipeline: Record<string, number>;
  recentActivity: Activity[];
  resumePerformance: {
    analyzed: number;
    total: number;
    bestResume?: string;
    bestScore?: number;
  };
  gmail: { status: string; pendingSuggestions: number };
  notifications: { unreadCount: number };
  sections: Record<string, string>;
};
export type AIUsageSummary = {
  operations: Array<{
    operation: string;
    used: number;
    limit: number;
    resetsAt: string;
  }>;
};
export type ApplicationCopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
export type ApplicationCopilotConversation = {
  conversationId?: string;
  messages: ApplicationCopilotMessage[];
  contextSources: string[];
  hasMore: boolean;
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
  lastAnalyzedAt?: string;
  latestAnalysisId?: string;
  latestOverallScore?: number;
  latestAnalysisTargetRole?: string;
  latestAnalysisCompany?: string;
  analysisStatus?: string;
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
