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
    resumeUsed: value.resume_used,
    jobUrl: value.job_url ?? "",
    recruiterName: value.recruiter_name,
    recruiterEmail: value.recruiter_email ?? "",
    salaryRange: value.salary_range,
    priority: priorityFromApi[value.priority],
    notes: value.notes,
    tags: value.tags,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
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
    applicationsUsed: 0, keywordMatchScore: safeScore(value.keyword_match_score), tags: stringArray(value.tags),
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
    missingKeywords: value.missing_keywords,
    strongKeywords: value.strong_keywords,
    weakBullets: weakBullets(value.weak_bullets),
    suggestedBulletRewrites: value.suggested_bullet_rewrites.map((rewrite) => ({
      original: rewrite.original,
      rewrite: rewrite.rewrite,
      whyBetter: rewrite.why_better ?? rewrite.rationale ?? "",
      groundedInResume: rewrite.grounded_in_resume ?? true,
    })),
    strengths: value.strengths,
    risks: value.risks,
    recommendations: value.recommendations,
    recruiterSummary: value.recruiter_summary ?? value.summary,
    summary: value.summary,
    provider: value.provider,
    model: value.model,
    status: value.status,
    errorMessage: value.error_message,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function toApiResumeAnalysis(value: ResumeAnalysisInput) {
  return defined({
    target_role: value.targetRole,
    company_name: value.companyName,
    job_description: value.jobDescription,
    resume_text: value.resumeText,
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
  return {
    id: value.id, question: value.question, category: value.category,
    starSituation: value.star_situation, starTask: value.star_task, starAction: value.star_action,
    starResult: value.star_result, confidenceScore: value.confidence_score,
    status: prepStatusFromApi[value.status], createdAt: value.created_at, updatedAt: value.updated_at,
  };
}

export function toApiBehavioral(value: Partial<BehavioralQuestion>) {
  return defined({
    question: value.question, category: value.category, star_situation: value.starSituation,
    star_task: value.starTask, star_action: value.starAction, star_result: value.starResult,
    confidence_score: value.confidenceScore,
    status: value.status ? prepStatusToApi[value.status] : undefined,
  });
}

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
function safeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
}
function resumeTextStatus(value: unknown): ResumeVersion["textExtractionStatus"] {
  return value === "manual" || value === "parsed" || value === "failed" ? value : "not_started";
}
function weakBullets(value: ApiResumeAnalysis["weak_bullets"]): ResumeAnalysis["weakBullets"] {
  return value.map((item) => ({
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
function inferCategory(input: ApplicationInput | Application): Application["category"] {
  const content = [input.company, input.role, input.source, input.resumeUsed, input.notes, ...input.tags].join(" ").toLowerCase();
  if (content.includes("google") || content.includes("meta")) return "Big Tech";
  if (content.includes("finance") || content.includes("bank") || content.includes("quant")) return "Finance";
  if (content.includes("stripe") || content.includes("capital") || content.includes("payment")) return "Fintech";
  if (content.includes("data") || content.includes("observability")) return "Data";
  return "Startup";
}
