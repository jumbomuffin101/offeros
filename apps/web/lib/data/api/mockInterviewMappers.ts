import type {
  MockInterviewEvaluation,
  MockInterviewQuestionPlan,
  MockInterviewScorecard,
  MockInterviewSession,
  MockInterviewTurn,
} from "@/lib/types";

type RecordValue = Record<string, unknown>;

export function fromApiMockInterview(value: RecordValue): MockInterviewSession {
  return {
    id: string(value.id),
    applicationId: optionalString(value.application_id),
    resumeVersionId: optionalString(value.resume_version_id),
    interviewType: value.interview_type as MockInterviewSession["interviewType"],
    status: value.status as MockInterviewSession["status"],
    difficulty: value.difficulty as MockInterviewSession["difficulty"],
    title: string(value.title),
    targetRole: string(value.target_role),
    companyName: string(value.company_name),
    questionCount: number(value.question_count),
    currentQuestionIndex: number(value.current_question_index),
    contextSources: strings(value.context_sources),
    startedAt: string(value.started_at),
    completedAt: optionalString(value.completed_at),
    provider: string(value.provider),
    model: string(value.model),
    overallScore: optionalNumber(value.overall_score),
    careerContextVersion: string(value.career_context_version),
    questionPlan: isRecord(value.question_plan)
      ? fromApiQuestionPlan(value.question_plan)
      : undefined,
    trendDelta: mapTrend(value.trend_delta),
    observationUpdates: array(value.observation_updates).map((item) => ({
      type: string(item.type),
      dimension: string(item.dimension),
      summary: string(item.summary),
      confidence: number(item.confidence),
      evidenceCount: number(item.evidence_count),
    })),
    intelligenceStatus:
      (value.intelligence_status as MockInterviewSession["intelligenceStatus"]) ??
      "unavailable",
    createdAt: string(value.created_at),
    updatedAt: string(value.updated_at),
    turns: array(value.turns).map(fromApiTurn),
    scorecard: isRecord(value.scorecard)
      ? fromApiScorecard(value.scorecard)
      : undefined,
  };
}

export function fromApiTurn(value: RecordValue): MockInterviewTurn {
  return {
    id: string(value.id),
    sessionId: string(value.session_id),
    turnIndex: number(value.turn_index),
    speaker: value.speaker as MockInterviewTurn["speaker"],
    content: string(value.content),
    questionType: optionalString(value.question_type) as MockInterviewTurn["questionType"],
    evaluation: isRecord(value.evaluation_json)
      ? fromApiEvaluation(value.evaluation_json)
      : undefined,
    createdAt: string(value.created_at),
  };
}

export function fromApiEvaluation(value: RecordValue): MockInterviewEvaluation {
  const scores = isRecord(value.scores) ? value.scores : {};
  return {
    scores: {
      accuracy: number(scores.accuracy),
      relevance: number(scores.relevance),
      clarity: number(scores.clarity),
      depth: number(scores.depth),
      structure: number(scores.structure),
      ...optionalScores(scores),
    },
    strengths: strings(value.strengths),
    weaknesses: strings(value.weaknesses),
    missedPoints: strings(value.missed_points),
    followUpNeeded: Boolean(value.follow_up_needed),
    followUpReason: optionalString(value.follow_up_reason),
    followUpQuestion: optionalString(value.follow_up_question),
    summary: string(value.summary),
    observationCandidates: array(value.observation_candidates).map((item) => ({
      type: item.type as MockInterviewEvaluation["observationCandidates"][number]["type"],
      dimension: string(item.dimension),
      summary: string(item.summary),
      confidence: number(item.confidence),
    })),
  };
}

export function fromApiQuestionPlan(value: RecordValue): MockInterviewQuestionPlan {
  return {
    interviewType: value.interview_type as MockInterviewQuestionPlan["interviewType"],
    difficulty: value.difficulty as MockInterviewQuestionPlan["difficulty"],
    targetDimensions: strings(value.target_dimensions),
    priorityTopics: strings(value.priority_topics),
    avoidRecentRepetition: strings(value.avoid_recent_repetition),
    recurringWeaknesses: strings(value.recurring_weaknesses),
    validatedStrengths: strings(value.validated_strengths),
    applicationSpecificTopics: strings(value.application_specific_topics),
    focusAreas: array(value.focus_areas).map((item) => ({
      key: string(item.key),
      label: string(item.label),
      reason: string(item.reason),
      source: item.source as MockInterviewQuestionPlan["focusAreas"][number]["source"],
    })),
    questionCount: number(value.question_count),
    maxFollowUpsPerQuestion: number(value.max_follow_ups_per_question),
  };
}

function mapTrend(value: unknown): MockInterviewSession["trendDelta"] {
  if (!isRecord(value)) return {};
  return {
    direction: optionalString(value.direction) as MockInterviewSession["trendDelta"]["direction"],
    currentScore: optionalNumber(value.current_score),
    recentAverage: optionalNumber(value.recent_average),
    delta: optionalNumber(value.delta),
    sampleSize: optionalNumber(value.sample_size),
    strongestDimension: optionalString(value.strongest_dimension),
    weakestDimension: optionalString(value.weakest_dimension),
  };
}

function fromApiScorecard(value: RecordValue): MockInterviewScorecard {
  return {
    id: string(value.id),
    sessionId: string(value.session_id),
    communicationScore: number(value.communication_score),
    technicalAccuracyScore: number(value.technical_accuracy_score),
    structureScore: number(value.structure_score),
    depthScore: number(value.depth_score),
    relevanceScore: number(value.relevance_score),
    behavioralScore: optionalNumber(value.behavioral_score),
    resumeFluencyScore: optionalNumber(value.resume_fluency_score),
    systemDesignScore: optionalNumber(value.system_design_score),
    technicalReasoningScore: optionalNumber(value.technical_reasoning_score),
    strengths: strings(value.strengths),
    weaknesses: strings(value.weaknesses),
    missedPoints: strings(value.missed_points),
    strongestAnswer: string(value.strongest_answer),
    weakestAnswer: string(value.weakest_answer),
    recommendedActions: strings(value.recommended_actions),
    summary: string(value.summary),
    createdAt: string(value.created_at),
    updatedAt: string(value.updated_at),
  };
}

function optionalScores(scores: RecordValue) {
  const keys = [
    "ownership",
    "impact",
    "reflection",
    "collaboration",
    "requirements",
    "decomposition",
    "scalability",
    "reliability",
    "tradeoffs",
  ] as const;
  return Object.fromEntries(
    keys.flatMap((key) =>
      typeof scores[key] === "number" ? [[key, scores[key]]] : [],
    ),
  );
}

function array(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
