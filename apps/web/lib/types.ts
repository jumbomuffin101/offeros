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
export type MockInterviewFocusArea = {
  key: string;
  label: string;
  reason: string;
  source: "history" | "observation" | "prep" | "role" | "default";
};
export type MockInterviewQuestionPlan = {
  interviewType: MockInterviewType;
  difficulty: MockInterviewDifficulty;
  targetDimensions: string[];
  priorityTopics: string[];
  avoidRecentRepetition: string[];
  recurringWeaknesses: string[];
  validatedStrengths: string[];
  applicationSpecificTopics: string[];
  focusAreas: MockInterviewFocusArea[];
  questionCount: number;
  maxFollowUpsPerQuestion: number;
};
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
  observationCandidates: Array<{
    type: "interview_weakness" | "interview_strength" | "interview_improvement";
    dimension: string;
    summary: string;
    confidence: number;
  }>;
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
  careerContextVersion: string;
  questionPlan?: MockInterviewQuestionPlan;
  trendDelta: {
    direction?: "improving" | "stable" | "declining" | "insufficient_data";
    currentScore?: number;
    recentAverage?: number;
    delta?: number;
    sampleSize?: number;
    strongestDimension?: string;
    weakestDimension?: string;
  };
  observationUpdates: Array<{
    type: string;
    dimension: string;
    summary: string;
    confidence: number;
    evidenceCount: number;
  }>;
  intelligenceStatus: "ready" | "partial" | "unavailable";
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
export type CareerRecommendation = {
  key: string;
  type: string;
  title: string;
  summary: string;
  priority: "urgent" | "high" | "medium" | "low";
  actionLabel: string;
  actionRoute: string;
  confidence: number;
  reasonCodes: string[];
};
export type CareerHealth = {
  status: "ready" | "insufficient_data";
  overallScore?: number;
  subscores: Record<string, number | undefined>;
  reasonCodes: string[];
  positiveDrivers: string[];
  negativeDrivers: string[];
  dataSufficiency: number;
  recommendedActions: string[];
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
  careerHealth?: CareerHealth;
  careerPriorities: CareerRecommendation[];
  improvementSignal?: { direction: string; currentValue?: number; comparisonValue?: number };
  riskSignal?: string;
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
  trendDirection?: "improving" | "stable" | "declining" | "insufficient_data";
  comparisonStatus?: "comparable" | "partially_comparable" | "not_comparable";
  recurringStrengths?: string[];
  recurringWeaknesses?: string[];
  applicationPerformance?: ResumePerformanceSummary;
  createdAt: string;
  updatedAt: string;
};

export type ResumePerformanceSummary = {
  status: "sufficient" | "insufficient_data";
  sampleSize: number;
  responseCount: number;
  oaCount: number;
  interviewCount: number;
  offerCount: number;
  responseRate?: number;
  oaRate?: number;
  interviewRate?: number;
  offerRate?: number;
  roleFamily: string;
  statement: string;
};

export type ResumeIntelligence = {
  version: string;
  analysisSchemaVersion: string;
  analysisMode: "general" | "target_role" | "application";
  applicationId?: string;
  comparison: {
    status: "comparable" | "partially_comparable" | "not_comparable";
    basis: string[];
    comparisonAnalysisId?: string;
    overallDelta?: number;
    keywordDelta?: number;
    improvedAreas: string[];
    declinedAreas: string[];
    unchangedAreas: string[];
    confidence: number;
  };
  deterministicSignals: Array<{ code?: string; summary?: string; [key: string]: unknown }>;
  recurringStrengths: string[];
  recurringWeaknesses: string[];
  observationCandidates: Array<{ type: string; scope: string; dimension: string; summary: string; confidence: number }>;
  recommendations: Array<{ key: string; title: string; summary: string; priority: string; route: string; scope: string }>;
  performance: ResumePerformanceSummary;
  careerHealthImpact: { resumeReadinessDelta?: number; boundedTo?: number; reason?: string };
  status: "ready" | "unavailable";
  simulated: boolean;
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
  intelligence: ResumeIntelligence;
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
  competencyTags?: string[];
  starCompleteness?: BehavioralStarCompleteness;
  latestEvaluation?: BehavioralEvaluationResult | null;
  latestEvaluatedAt?: string;
  evaluationSchemaVersion?: string;
  trendSummary?: BehavioralComparison | null;
  observationSummary?: Record<string, unknown>;
  readinessStatus?: BehavioralReadiness;
  careerContextVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type BehavioralReadiness = "draft" | "needs_work" | "practice_ready" | "interview_ready";
export type BehavioralStarCompleteness = { score: number; sections: Record<string, boolean>; signals: string[]; wordCount: number; schemaVersion: string };
export type BehavioralEvaluationResult = {
  competencies: string[];
  starScores: Record<"situation" | "task" | "action" | "result" | "reflection", number>;
  qualityScores: Record<"clarity" | "specificity" | "ownership" | "impact" | "conciseness" | "authenticity", number>;
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  recommendedRevision: string[];
  observationCandidates: Record<string, unknown>[];
};
export type BehavioralComparison = { priorEvaluationId: string | null; status: "comparable" | "partially_comparable" | "not_comparable"; dataSufficiency: string; scoreDeltas: Record<string, number>; improvedAreas: string[]; declinedAreas: string[]; unchangedAreas: string[] };
export type BehavioralEvaluation = { id: string; storyId: string; applicationId: string | null; competencyFocus: string | null; evaluation: BehavioralEvaluationResult; comparison: BehavioralComparison; observationSummary: Record<string, unknown>; provider: string; model: string; status: string; createdAt: string };
export type BehavioralPortfolio = { totalStories: number; evaluatedStories: number; interviewReadyStories: number; competenciesCovered: string[]; missingCompetencies: string[]; overusedStoryIds: string[]; storiesNeedingWork: string[]; strongestStoryId: string | null; weakestStoryId: string | null; topNextAction: string; dataSufficiency: "insufficient" | "partial" | "sufficient" };
export type BehavioralPracticeResult = { id: string; storyId: string | null; applicationId: string | null; competency: string; prompt: string; evaluation: BehavioralEvaluationResult; status: string; completedAt: string; createdAt: string };

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
