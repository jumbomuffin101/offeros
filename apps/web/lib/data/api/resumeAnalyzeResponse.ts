import type { ApiResume, ApiResumeAnalysis } from "@/lib/data/api/contracts";
import { DataError } from "@/lib/data/errors";

export function parseAnalyzeData(response: unknown): { analysis: ApiResumeAnalysis; resume: ApiResume | null } {
  if (!isRecord(response)) {
    throw new DataError("API_ERROR", "OfferOS received an unexpected analysis response.");
  }

  // The canonical endpoint returns { analysis, resume }. Keep this adapter as
  // the only legacy boundary while an older backend deployment is replaced.
  if (isRecord(response.data) && isCanonicalAnalysis(response.data as ApiResumeAnalysis)) {
    return { analysis: response.data as ApiResumeAnalysis, resume: null };
  }

  const analysis = isRecord(response.analysis) ? response.analysis as ApiResumeAnalysis : null;
  const resume = isRecord(response.resume) ? response.resume as ApiResume : null;
  if (!analysis || !resume || !isCanonicalAnalysis(analysis) || !isCanonicalResume(resume)) {
    throw new DataError("API_ERROR", "OfferOS received an unexpected analysis response.");
  }
  return { analysis, resume };
}

function isCanonicalAnalysis(value: ApiResumeAnalysis) {
  return isId(value.id)
    && isId(value.resume_version_id)
    && isString(value.target_role)
    && isNullableString(value.company_name)
    && areScoresValid([
      value.overall_score,
      value.keyword_score,
      value.impact_score,
      value.clarity_score,
      value.technical_depth_score,
      value.experience_match_score,
    ])
    && areStringArrays([value.missing_keywords, value.strong_keywords, value.strengths, value.risks, value.recommendations])
    && Array.isArray(value.weak_bullets)
    && Array.isArray(value.suggested_bullet_rewrites)
    && isNullableString(value.recruiter_summary)
    && isString(value.summary)
    && isString(value.provider)
    && isString(value.model)
    && isString(value.status)
    && isString(value.created_at);
}

function isCanonicalResume(value: ApiResume) {
  return isId(value.id)
    && areScoresValid([value.keyword_match_score, value.latest_overall_score])
    && isNullableId(value.latest_analysis_id)
    && isNullableString(value.last_analyzed_at)
    && isString(value.latest_analysis_target_role)
    && isString(value.latest_analysis_company)
    && isString(value.analysis_status)
    && areStringArrays([value.strengths, value.weaknesses, value.missing_keywords])
    && isNullableString(value.suggested_improvement);
}

function areScoresValid(values: Array<number | null | undefined>) {
  return values.every((value) => value == null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100));
}

function areStringArrays(values: unknown[]) {
  return values.every((value) => Array.isArray(value) && value.every(isString));
}

function isId(value: unknown) {
  return isString(value) && value.length > 0;
}

function isNullableId(value: unknown) {
  return value == null || isId(value);
}

function isNullableString(value: unknown) {
  return value == null || isString(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
