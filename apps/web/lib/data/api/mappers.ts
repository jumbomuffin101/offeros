import type {
  Application,
  ApplicationPriority,
  ApplicationStatus,
  BehavioralQuestion,
  CodingProblem,
  PrepStatus,
  ResumeVersion,
  ResumeAnalysis,
  SystemDesignPrompt,
} from "@/lib/types";
import type {
  ApplicationInput,
  CodingProblemInput,
  PrepUpdateInput,
  ResumeInput,
  ResumeAnalysisInput,
  SystemDesignInput,
} from "@/lib/data/types";
import type {
  ApiApplication,
  ApiBehavioralQuestion,
  ApiBehavioralEvaluation,
  ApiBehavioralPortfolio,
  ApiBehavioralPractice,
  ApiCodingProblem,
  ApiPrepStatus,
  ApiResume,
  ApiResumeAnalysis,
  ApiSystemDesignPrompt,
} from "@/lib/data/api/contracts";

const applicationStatusToApi: Record<ApplicationStatus, ApiApplication["status"]> = {
  Wishlist: "wishlist", Applying: "applying", Applied: "applied", OA: "oa",
  Interview: "interview", "Final Round": "final_round", Offer: "offer", Rejected: "rejected",
};
const applicationStatusFromApi = invert(applicationStatusToApi);
const priorityToApi: Record<ApplicationPriority, ApiApplication["priority"]> = { Low: "low", Medium: "medium", High: "high" };
const priorityFromApi = invert(priorityToApi);
const prepStatusToApi: Record<PrepStatus, ApiPrepStatus> = {
  "Not Started": "not_started", "In Progress": "in_progress", Completed: "completed", Skipped: "skipped",
};
const prepStatusFromApi = invert(prepStatusToApi);

export function fromApiApplication(value: ApiApplication): Application {
  const application: Application = {
    id: value.id,
    company: value.company,
    role: value.role,
    location: value.location,
    status: applicationStatusFromApi[value.status],
    dateApplied: value.date_applied ?? "",
    deadline: value.deadline ?? "",
    source: value.source,
    externalJobId: value.external_job_id ?? "",
    capturedAt: value.captured_at ?? "",
    nextAction: value.next_action ?? "",
    nextActionDueAt: value.next_action_due_at ?? "",
    nextEventType: value.next_event_type ?? "",
    resumeUsed: value.resume_used,
    resumeVersionId: value.resume_version_id ?? "",
    resumeAnalysisId: value.resume_analysis_id ?? "",
    jobDescription: value.job_description ?? "",
    selectedResumeName: value.selected_resume_name ?? "",
    selectedResumeTargetRole: value.selected_resume_target_role ?? "",
    analysisStatus: value.analysis_status ?? "",
    analysisOverallScore: value.analysis_overall_score == null ? undefined : safeScore(value.analysis_overall_score),
    analysisKeywordScore: value.analysis_keyword_score == null ? undefined : safeScore(value.analysis_keyword_score),
    analysisMissingKeywordCount: Number.isFinite(Number(value.analysis_missing_keyword_count)) ? Number(value.analysis_missing_keyword_count) : 0,
    analysisLastAnalyzedAt: value.analysis_last_analyzed_at ?? "",
    jobUrl: value.job_url ?? "",
    recruiterName: value.recruiter_name,
    recruiterEmail: value.recruiter_email ?? "",
    salaryRange: value.salary_range,
    priority: priorityFromApi[value.priority],
    notes: value.notes,
    tags: value.tags,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    meaningfulUpdatedAt: value.meaningful_updated_at ?? value.updated_at,
    category: "Startup",
  };
  return { ...application, category: inferCategory(application) };
}

export function toApiApplication(value: Partial<ApplicationInput>) {
  return defined({
    company: value.company,
    role: value.role,
    location: value.location,
    status: value.status ? applicationStatusToApi[value.status] : undefined,
    date_applied: value.dateApplied === undefined ? undefined : value.dateApplied || null,
    deadline: value.deadline === undefined ? undefined : value.deadline || null,
    source: value.source,
    resume_used: value.resumeUsed,
    resume_version_id: value.resumeVersionId === undefined ? undefined : value.resumeVersionId || null,
    resume_analysis_id: value.resumeAnalysisId === undefined ? undefined : value.resumeAnalysisId || null,
    job_description: value.jobDescription,
    job_url: value.jobUrl === undefined ? undefined : value.jobUrl || null,
    recruiter_name: value.recruiterName,
    recruiter_email: value.recruiterEmail === undefined ? undefined : value.recruiterEmail || null,
    salary_range: value.salaryRange,
    priority: value.priority ? priorityToApi[value.priority] : undefined,
    notes: value.notes,
    tags: value.tags,
  });
}

export function fromApiResume(value: ApiResume): ResumeVersion {
  return {
    id: value.id, name: value.name, targetRole: value.target_role, description: value.description ?? "",
    status: value.status === "active" ? "Active" : "Draft", lastUpdated: value.updated_at,
    applicationsUsed: Number.isFinite(Number(value.applications_used)) ? Number(value.applications_used) : 0, keywordMatchScore: safeScore(value.keyword_match_score), tags: stringArray(value.tags),
    strengths: stringArray(value.strengths), weaknesses: stringArray(value.weaknesses), missingKeywords: stringArray(value.missing_keywords),
    suggestedImprovement: value.suggested_improvement ?? "", notes: value.notes ?? "", fileName: value.file_name ?? "",
    originalFileName: value.original_file_name ?? "", extractedText: value.extracted_text ?? "",
    textExtractionStatus: resumeTextStatus(value.text_extraction_status), textExtractionError: value.text_extraction_error ?? "",
    extractedAt: value.extracted_at ?? "",
    extractionCharacterCount: Number.isFinite(Number(value.extraction_character_count)) ? Number(value.extraction_character_count) : 0,
    lastAnalyzedAt: value.last_analyzed_at ?? "",
    latestAnalysisId: value.latest_analysis_id ?? "",
    latestOverallScore: value.latest_overall_score == null ? undefined : safeScore(value.latest_overall_score),
    latestAnalysisTargetRole: value.latest_analysis_target_role ?? "",
    latestAnalysisCompany: value.latest_analysis_company ?? "",
    analysisStatus: value.analysis_status ?? "",
    trendDirection: value.trend_direction ?? "insufficient_data",
    comparisonStatus: value.comparison_status ?? "not_comparable",
    recurringStrengths: stringArray(value.recurring_strengths),
    recurringWeaknesses: stringArray(value.recurring_weaknesses),
    applicationPerformance: fromApiResumePerformance(value.application_performance),
    createdAt: value.created_at, updatedAt: value.updated_at,
  };
}

export function toApiResume(value: Partial<ResumeInput>) {
  return defined({
    name: value.name, target_role: value.targetRole, description: value.description,
    status: value.status?.toLowerCase(), keyword_match_score: value.keywordMatchScore,
    tags: value.tags, strengths: value.strengths, weaknesses: value.weaknesses,
    missing_keywords: value.missingKeywords, suggested_improvement: value.suggestedImprovement,
    notes: value.notes, file_name: value.fileName, original_file_name: value.originalFileName,
    extracted_text: value.extractedText, text_extraction_status: value.textExtractionStatus,
    text_extraction_error: value.textExtractionError,
    extracted_at: value.extractedAt, extraction_character_count: value.extractionCharacterCount,
    last_analyzed_at: value.lastAnalyzedAt, latest_analysis_id: value.latestAnalysisId,
    latest_overall_score: value.latestOverallScore, latest_analysis_target_role: value.latestAnalysisTargetRole,
    latest_analysis_company: value.latestAnalysisCompany, analysis_status: value.analysisStatus,
  });
}

export function fromApiResumeAnalysis(value: ApiResumeAnalysis): ResumeAnalysis {
  return {
    id: value.id,
    resumeVersionId: value.resume_version_id,
    companyName: value.company_name ?? "",
    targetRole: value.target_role,
    jobDescription: value.job_description,
    inputResumeHash: value.input_resume_hash ?? "",
    overallScore: value.overall_score,
    keywordScore: value.keyword_score,
    impactScore: value.impact_score,
    clarityScore: value.clarity_score,
    technicalDepthScore: value.technical_depth_score,
    experienceMatchScore: value.experience_match_score ?? 0,
    requiredSkillsMatch: skillMatches(value.required_skills_match),
    preferredSkillsMatch: skillMatches(value.preferred_skills_match),
    missingKeywords: stringArray(value.missing_keywords),
    strongKeywords: stringArray(value.strong_keywords),
    weakBullets: weakBullets(value.weak_bullets),
    suggestedBulletRewrites: safeArray(value.suggested_bullet_rewrites).map((rewrite) => ({
      original: rewrite.original,
      rewrite: rewrite.rewrite,
      whyBetter: rewrite.why_better ?? rewrite.rationale ?? "",
      groundedInResume: rewrite.grounded_in_resume ?? true,
    })),
    strengths: stringArray(value.strengths),
    risks: stringArray(value.risks),
    recommendations: stringArray(value.recommendations),
    recruiterSummary: value.recruiter_summary ?? value.summary,
    summary: value.summary,
    provider: value.provider,
    model: value.model,
    status: value.status,
    errorMessage: value.error_message,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    intelligence: fromApiResumeIntelligence(value.intelligence_json),
  };
}

export function toApiResumeAnalysis(value: ResumeAnalysisInput) {
  return defined({
    target_role: value.targetRole,
    company_name: value.companyName || null,
    job_description: value.jobDescription,
    resume_text: value.resumeText,
    analysis_request_id: value.analysisRequestId,
    analysis_mode: value.analysisMode,
  });
}

export function fromApiCoding(value: ApiCodingProblem): CodingProblem {
  return {
    id: value.id, title: value.title, difficulty: titleCase(value.difficulty) as CodingProblem["difficulty"],
    topic: value.topic, targetTimeMinutes: value.target_time_minutes,
    status: prepStatusFromApi[value.status], notes: value.notes, link: value.link ?? "",
    completedAt: value.completed_at ?? "", createdAt: value.created_at, updatedAt: value.updated_at,
  };
}

export function toApiCoding(value: Partial<CodingProblemInput>) {
  return defined({
    title: value.title, difficulty: value.difficulty?.toLowerCase(), topic: value.topic,
    target_time_minutes: value.targetTimeMinutes,
    status: value.status ? prepStatusToApi[value.status] : undefined,
    notes: value.notes, link: value.link === undefined ? undefined : value.link || null,
  });
}

export function fromApiBehavioral(value: ApiBehavioralQuestion): BehavioralQuestion {
  const completeness = value.star_completeness_json ?? {};
  return {
    id: value.id, question: value.question, category: value.category,
    starSituation: value.star_situation, starTask: value.star_task, starAction: value.star_action,
    starResult: value.star_result, confidenceScore: value.confidence_score,
    status: prepStatusFromApi[value.status],
    competencyTags: value.competency_tags ?? [],
    starCompleteness: {
      score: typeof completeness.score === "number" ? completeness.score : 0,
      sections: isRecord(completeness.sections) ? completeness.sections as Record<string, boolean> : {},
      signals: stringArray(completeness.signals),
      wordCount: typeof completeness.word_count === "number" ? completeness.word_count : 0,
      schemaVersion: typeof completeness.schema_version === "string" ? completeness.schema_version : "star-completeness-v1",
    },
    latestEvaluation: mapBehavioralResult(value.latest_evaluation_json),
    latestEvaluatedAt: value.latest_evaluated_at ?? "",
    evaluationSchemaVersion: value.evaluation_schema_version ?? "behavioral-evaluation-v1",
    trendSummary: mapBehavioralComparison(value.trend_summary_json),
    observationSummary: value.observation_summary_json ?? {},
    readinessStatus: isBehavioralReadiness(value.readiness_status) ? value.readiness_status : "draft",
    careerContextVersion: value.career_context_version ?? "",
    createdAt: value.created_at, updatedAt: value.updated_at,
  };
}

export function toApiBehavioral(value: Partial<BehavioralQuestion>) {
  return defined({
    question: value.question, category: value.category, star_situation: value.starSituation,
    star_task: value.starTask, star_action: value.starAction, star_result: value.starResult,
    confidence_score: value.confidenceScore,
    competency_tags: value.competencyTags,
    status: value.status ? prepStatusToApi[value.status] : undefined,
  });
}

export function fromApiBehavioralEvaluation(value: ApiBehavioralEvaluation) {
  return {
    id: value.id,
    storyId: value.story_id,
    applicationId: value.application_id,
    competencyFocus: value.competency_focus,
    evaluation: mapBehavioralResult(value.evaluation_json) ?? emptyBehavioralResult(),
    comparison: mapBehavioralComparison(value.comparison_json) ?? emptyBehavioralComparison(),
    observationSummary: value.observation_summary_json ?? {},
    provider: value.provider,
    model: value.model,
    status: value.status,
    createdAt: value.created_at,
  };
}

export function fromApiBehavioralPortfolio(value: ApiBehavioralPortfolio) {
  return { totalStories: value.total_stories, evaluatedStories: value.evaluated_stories, interviewReadyStories: value.interview_ready_stories, competenciesCovered: value.competencies_covered, missingCompetencies: value.missing_competencies, overusedStoryIds: value.overused_story_ids, storiesNeedingWork: value.stories_needing_work, strongestStoryId: value.strongest_story_id, weakestStoryId: value.weakest_story_id, topNextAction: value.top_next_action, dataSufficiency: value.data_sufficiency };
}

export function fromApiBehavioralPractice(value: ApiBehavioralPractice) {
  return { id: value.id, storyId: value.story_id, applicationId: value.application_id, competency: value.competency, prompt: value.prompt, evaluation: mapBehavioralResult(value.evaluation_json) ?? emptyBehavioralResult(), status: value.status, completedAt: value.completed_at ?? "", createdAt: value.created_at };
}

function mapBehavioralResult(value: Record<string, unknown> | undefined) {
  if (!isRecord(value) || !isRecord(value.star_scores) || !isRecord(value.quality_scores)) return null;
  return { competencies: stringArray(value.competencies), starScores: numberRecord(value.star_scores) as import("@/lib/types").BehavioralEvaluationResult["starScores"], qualityScores: numberRecord(value.quality_scores) as import("@/lib/types").BehavioralEvaluationResult["qualityScores"], strengths: stringArray(value.strengths), weaknesses: stringArray(value.weaknesses), missingElements: stringArray(value.missing_elements), recommendedRevision: stringArray(value.recommended_revision), observationCandidates: Array.isArray(value.observation_candidates) ? value.observation_candidates.filter(isRecord) : [] };
}

function mapBehavioralComparison(value: Record<string, unknown> | undefined) {
  if (!isRecord(value) || !["comparable", "partially_comparable", "not_comparable"].includes(String(value.status))) return null;
  return { priorEvaluationId: typeof value.prior_evaluation_id === "string" ? value.prior_evaluation_id : null, status: String(value.status) as import("@/lib/types").BehavioralComparison["status"], dataSufficiency: String(value.data_sufficiency ?? "insufficient"), scoreDeltas: numberRecord(value.score_deltas), improvedAreas: stringArray(value.improved_areas), declinedAreas: stringArray(value.declined_areas), unchangedAreas: stringArray(value.unchanged_areas) };
}

function emptyBehavioralResult(): import("@/lib/types").BehavioralEvaluationResult { return { competencies: [], starScores: { situation: 1, task: 1, action: 1, result: 1, reflection: 1 }, qualityScores: { clarity: 1, specificity: 1, ownership: 1, impact: 1, conciseness: 1, authenticity: 1 }, strengths: [], weaknesses: [], missingElements: [], recommendedRevision: [], observationCandidates: [] }; }
function emptyBehavioralComparison(): import("@/lib/types").BehavioralComparison { return { priorEvaluationId: null, status: "not_comparable", dataSufficiency: "insufficient", scoreDeltas: {}, improvedAreas: [], declinedAreas: [], unchangedAreas: [] }; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function numberRecord(value: unknown): Record<string, number> { return isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number")) : {}; }
function isBehavioralReadiness(value: unknown): value is import("@/lib/types").BehavioralReadiness { return ["draft", "needs_work", "practice_ready", "interview_ready"].includes(String(value)); }

export function fromApiSystemDesign(value: ApiSystemDesignPrompt): SystemDesignPrompt {
  return {
    id: value.id, title: value.title, prompt: value.prompt, concepts: value.concepts,
    status: prepStatusFromApi[value.status], notes: value.notes,
    createdAt: value.created_at, updatedAt: value.updated_at,
  };
}

export function toApiSystemDesign(value: Partial<SystemDesignInput>) {
  return defined({
    title: value.title, prompt: value.prompt, concepts: value.concepts,
    status: value.status ? prepStatusToApi[value.status] : undefined, notes: value.notes,
  });
}

export function toApiPrepUpdate(input: PrepUpdateInput) {
  if (input.type === "coding") return toApiCoding(input.value);
  if (input.type === "behavioral") return toApiBehavioral(input.value);
  return toApiSystemDesign(input.value);
}

function defined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
function invert<K extends string, V extends string>(value: Record<K, V>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [item, key])) as Record<V, K>;
}
function titleCase(value: string) { return `${value.charAt(0).toUpperCase()}${value.slice(1)}`; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function safeArray<T>(value: T[] | undefined | null) { return Array.isArray(value) ? value : []; }
function safeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
}
function resumeTextStatus(value: unknown): ResumeVersion["textExtractionStatus"] {
  return value === "manual" || value === "parsed" || value === "failed" ? value : "not_started";
}
function weakBullets(value: ApiResumeAnalysis["weak_bullets"]): ResumeAnalysis["weakBullets"] {
  return safeArray(value).map((item) => ({
    original: item.original ?? "",
    issue: item.issue ?? "",
    suggestion: item.suggestion ?? "",
  }));
}
function skillMatches(value: ApiResumeAnalysis["required_skills_match"]): ResumeAnalysis["requiredSkillsMatch"] {
  return Array.isArray(value) ? value.map((item) => ({
    skill: item.skill ?? "",
    status: item.status === "strong" || item.status === "partial" ? item.status : "missing",
    evidence: typeof item.evidence === "string" ? item.evidence : null,
  })) : [];
}
function fromApiResumePerformance(value: import("@/lib/data/api/contracts").ApiResumePerformance | undefined): import("@/lib/types").ResumePerformanceSummary {
  return {
    status: value?.status === "sufficient" ? "sufficient" : "insufficient_data",
    sampleSize: Number(value?.sample_size ?? 0),
    responseCount: Number(value?.response_count ?? 0),
    oaCount: Number(value?.oa_count ?? 0),
    interviewCount: Number(value?.interview_count ?? 0),
    offerCount: Number(value?.offer_count ?? 0),
    responseRate: nullableNumber(value?.response_rate),
    oaRate: nullableNumber(value?.oa_rate),
    interviewRate: nullableNumber(value?.interview_rate),
    offerRate: nullableNumber(value?.offer_rate),
    roleFamily: value?.role_family ?? "general_swe",
    statement: value?.statement ?? "Not enough application outcomes yet.",
  };
}
function fromApiResumeIntelligence(value: ApiResumeAnalysis["intelligence_json"]): ResumeAnalysis["intelligence"] {
  const comparison = value?.comparison;
  return {
    version: value?.version ?? "resume-intelligence-v1",
    analysisSchemaVersion: value?.analysis_schema_version ?? "legacy",
    analysisMode: value?.analysis_mode ?? "target_role",
    applicationId: value?.application_id ?? undefined,
    comparison: {
      status: comparison?.status ?? "not_comparable",
      basis: stringArray(comparison?.basis),
      comparisonAnalysisId: comparison?.comparison_analysis_id ?? undefined,
      overallDelta: nullableNumber(comparison?.overall_delta),
      keywordDelta: nullableNumber(comparison?.keyword_delta),
      improvedAreas: stringArray(comparison?.improved_areas),
      declinedAreas: stringArray(comparison?.declined_areas),
      unchangedAreas: stringArray(comparison?.unchanged_areas),
      confidence: Number(comparison?.confidence ?? 0),
    },
    deterministicSignals: Array.isArray(value?.deterministic_signals) ? value.deterministic_signals : [],
    recurringStrengths: stringArray(value?.recurring_strengths),
    recurringWeaknesses: stringArray(value?.recurring_weaknesses),
    observationCandidates: Array.isArray(value?.observation_candidates) ? value.observation_candidates.map((item) => ({ type: item.type ?? "", scope: item.scope ?? "resume_version", dimension: item.dimension ?? "general", summary: item.summary ?? "", confidence: Number(item.confidence ?? 0) })) : [],
    recommendations: Array.isArray(value?.recommendations) ? value.recommendations.map((item) => ({ key: item.key ?? "", title: item.title ?? "", summary: item.summary ?? "", priority: item.priority ?? "medium", route: item.route ?? "/resumes", scope: item.scope ?? "resume_version" })) : [],
    performance: fromApiResumePerformance(value?.performance),
    careerHealthImpact: {
      resumeReadinessDelta: nullableNumber(value?.career_health_impact?.resume_readiness_delta),
      boundedTo: nullableNumber(value?.career_health_impact?.bounded_to),
      reason: value?.career_health_impact?.reason,
    },
    status: value?.status === "unavailable" ? "unavailable" : "ready",
    simulated: Boolean(value?.simulated),
  };
}
function nullableNumber(value: unknown) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? undefined : number;
}
function inferCategory(input: ApplicationInput | Application): Application["category"] {
  const content = [input.company, input.role, input.source, input.resumeUsed, input.notes, ...input.tags].join(" ").toLowerCase();
  if (content.includes("google") || content.includes("meta")) return "Big Tech";
  if (content.includes("finance") || content.includes("bank") || content.includes("quant")) return "Finance";
  if (content.includes("stripe") || content.includes("capital") || content.includes("payment")) return "Fintech";
  if (content.includes("data") || content.includes("observability")) return "Data";
  return "Startup";
}
