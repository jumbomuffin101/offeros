import type { ResumeAnalysisInput, ResumeAnalyzeResult } from "@/lib/data/types";
import { DataError } from "@/lib/data/errors";
import type { ResumeAnalysis, ResumeVersion } from "@/lib/types";

export const RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR =
  "Analysis completed, but OfferOS could not update the resume summary. Please refresh and try again.";
export const RESUME_ANALYSIS_MISSING_RESUME_ERROR =
  "OfferOS could not identify this resume. Close and reopen it, then try again.";
export const RESUME_ANALYSIS_MISSING_JOB_DESCRIPTION_ERROR =
  "Add a job description before running analysis.";
export const RESUME_ANALYSIS_MISSING_RESUME_TEXT_ERROR =
  "Upload a resume or add resume text before running analysis.";
export const RESUME_ANALYSIS_START_ERROR =
  "OfferOS could not start the analysis.";
export const RESUME_ANALYSIS_INVALID_RESPONSE_ERROR =
  "OfferOS received an unexpected analysis response.";

export type ResumeAnalysisStatus = "idle" | "validating" | "submitting" | "completed" | "failed";

export class ResumeAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeAnalysisValidationError";
  }
}

export function mergeAnalyzedResume(
  resumes: ResumeVersion[] | null,
  resumeId: string,
  result: ResumeAnalyzeResult,
) {
  if (!resumes) return resumes;
  return resumes.map((resume) => resume.id === resumeId ? result.resume ?? resumeSummaryFromAnalysis(resume, result.analysis) : resume);
}

export function resumeSummaryFromAnalysis(resume: ResumeVersion, analysis: ResumeAnalysis): ResumeVersion {
  return {
    ...resume,
    keywordMatchScore: analysis.keywordScore,
    strengths: analysis.strengths,
    weaknesses: analysis.risks,
    missingKeywords: analysis.missingKeywords,
    suggestedImprovement: analysis.recommendations[0] || analysis.summary,
    lastAnalyzedAt: analysis.createdAt,
    latestAnalysisId: analysis.id,
    latestOverallScore: analysis.overallScore,
    latestAnalysisTargetRole: analysis.targetRole,
    latestAnalysisCompany: analysis.companyName,
    analysisStatus: analysis.status,
    lastUpdated: analysis.updatedAt || resume.lastUpdated,
    updatedAt: analysis.updatedAt || resume.updatedAt,
  };
}

export function analysisErrorMessage(cause: unknown) {
  if (cause instanceof ResumeAnalysisValidationError) return cause.message;
  if (cause instanceof DataError) return cause.message;
  if (isUndefinedPropertyTypeError(cause)) return RESUME_ANALYSIS_INVALID_RESPONSE_ERROR;
  if (cause instanceof TypeError) return RESUME_ANALYSIS_START_ERROR;
  return cause instanceof Error ? cause.message : "Unable to analyze this resume.";
}

export function unexpectedAnalysisStartError(cause: unknown) {
  if (cause instanceof ResumeAnalysisValidationError) return cause.message;
  return RESUME_ANALYSIS_START_ERROR;
}

/** Validates the mutation result only after the analysis request has resolved. */
export function validateResumeAnalysisResult(result: unknown): asserts result is ResumeAnalyzeResult {
  if (!isRecord(result) || !isRecord(result.analysis) || !stringValue(result.analysis.id)) {
    throw new DataError("API_ERROR", RESUME_ANALYSIS_INVALID_RESPONSE_ERROR);
  }
}

export async function invokeResumeAnalysis(
  analyze: (resumeId: string, payload: ResumeAnalysisInput) => Promise<unknown>,
  request: ReturnType<typeof buildResumeAnalysisRequest>,
): Promise<ResumeAnalyzeResult> {
  const result = await analyze(request.resumeId, request.payload);
  validateResumeAnalysisResult(result);
  return result;
}

export function buildResumeAnalysisRequest({
  resume,
  targetRole,
  companyName,
  jobDescription,
  resumeText,
  analysisRequestId,
}: {
  resume: ResumeVersion | null | undefined;
  targetRole: unknown;
  companyName: unknown;
  jobDescription: unknown;
  resumeText: unknown;
  analysisRequestId?: unknown;
}): { resumeId: string; payload: ResumeAnalysisInput; diagnostics: { hasResumeText: boolean; hasJobDescription: boolean } } {
  const resumeId = stringValue(resume?.id);
  if (!resumeId) throw new ResumeAnalysisValidationError(RESUME_ANALYSIS_MISSING_RESUME_ERROR);

  const normalizedTargetRole = stringValue(targetRole);
  if (!normalizedTargetRole) throw new ResumeAnalysisValidationError("Add a target role before running analysis.");

  const normalizedResumeText = stringValue(resumeText);
  if (!normalizedResumeText) throw new ResumeAnalysisValidationError(RESUME_ANALYSIS_MISSING_RESUME_TEXT_ERROR);

  const normalizedJobDescription = stringValue(jobDescription);
  if (!normalizedJobDescription || normalizedJobDescription.length < 80) {
    throw new ResumeAnalysisValidationError(RESUME_ANALYSIS_MISSING_JOB_DESCRIPTION_ERROR);
  }

  return {
    resumeId,
    payload: {
      targetRole: normalizedTargetRole,
      companyName: stringValue(companyName),
      jobDescription: normalizedJobDescription,
      resumeText: normalizedResumeText,
      analysisRequestId: stringValue(analysisRequestId) || undefined,
    },
    diagnostics: {
      hasResumeText: normalizedResumeText.length > 0,
      hasJobDescription: normalizedJobDescription.length > 0,
    },
  };
}

function isUndefinedPropertyTypeError(cause: unknown) {
  return cause instanceof TypeError && /Cannot read properties of undefined/.test(cause.message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
