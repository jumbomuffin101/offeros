import type { ResumeAnalyzeResult } from "@/lib/data/types";
import type { ResumeVersion } from "@/lib/types";

export const RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR =
  "Analysis completed, but OfferOS could not update the resume summary. Please refresh and try again.";

export function mergeAnalyzedResume(
  resumes: ResumeVersion[] | null,
  resumeId: string,
  result: ResumeAnalyzeResult,
) {
  if (!resumes || !result.resume) return resumes;
  return resumes.map((resume) => resume.id === resumeId ? result.resume ?? resume : resume);
}

export function analysisErrorMessage(cause: unknown) {
  if (isUndefinedPropertyTypeError(cause)) return RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR;
  return cause instanceof Error ? cause.message : "Unable to analyze this resume.";
}

function isUndefinedPropertyTypeError(cause: unknown) {
  return cause instanceof TypeError && /Cannot read properties of undefined/.test(cause.message);
}
