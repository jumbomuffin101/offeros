import type { ResumeAnalysisInput, ResumeAnalyzeResult } from "@/lib/data/types";
import type { ResumeVersion } from "@/lib/types";

export const RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR =
  "Analysis completed, but OfferOS could not update the resume summary. Please refresh and try again.";
export const RESUME_ANALYSIS_MISSING_RESUME_ERROR =
  "OfferOS could not identify this resume. Close and reopen it, then try again.";
export const RESUME_ANALYSIS_MISSING_JOB_DESCRIPTION_ERROR =
  "Add a job description before running analysis.";
export const RESUME_ANALYSIS_MISSING_RESUME_TEXT_ERROR =
  "Upload a resume or add resume text before running analysis.";
export const RESUME_ANALYSIS_START_ERROR =
  "Something went wrong while starting the analysis.";

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
  if (!resumes || !result.resume) return resumes;
  return resumes.map((resume) => resume.id === resumeId ? result.resume ?? resume : resume);
}

export function analysisErrorMessage(cause: unknown) {
  if (cause instanceof ResumeAnalysisValidationError) return cause.message;
  if (isUndefinedPropertyTypeError(cause)) return RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR;
  return cause instanceof Error ? cause.message : "Unable to analyze this resume.";
}

export function unexpectedAnalysisStartError(cause: unknown) {
  if (cause instanceof ResumeAnalysisValidationError) return cause.message;
  if (isUndefinedPropertyTypeError(cause)) return RESUME_ANALYSIS_START_ERROR;
  return cause instanceof Error ? cause.message : RESUME_ANALYSIS_START_ERROR;
}

export function buildResumeAnalysisRequest({
  resume,
  targetRole,
  companyName,
  jobDescription,
  resumeText,
}: {
  resume: ResumeVersion | null | undefined;
  targetRole: unknown;
  companyName: unknown;
  jobDescription: unknown;
  resumeText: unknown;
}): { resumeId: string; payload: ResumeAnalysisInput; diagnostics: { hasResumeText: boolean; hasJobDescription: boolean } } {
  const resumeId = stringValue(resume?.id);
  if (!resumeId) throw new ResumeAnalysisValidationError(RESUME_ANALYSIS_MISSING_RESUME_ERROR);

  const normalizedTargetRole = stringValue(targetRole);
  if (!normalizedTargetRole) throw new ResumeAnalysisValidationError("Target role is required.");

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

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
