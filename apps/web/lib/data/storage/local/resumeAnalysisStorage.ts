import type { ResumeAnalysis } from "@/lib/types";

export const RESUME_ANALYSIS_STORAGE_KEY = "offeros:resume-analyses";

export function readResumeAnalyses() {
  const raw = browserStorage().getItem(RESUME_ANALYSIS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeAnalysis).filter((item): item is ResumeAnalysis => item !== null)
      : [];
  } catch {
    return [];
  }
}

export function writeResumeAnalyses(analyses: ResumeAnalysis[]) {
  browserStorage().setItem(RESUME_ANALYSIS_STORAGE_KEY, JSON.stringify(analyses));
}

function normalizeAnalysis(value: unknown): ResumeAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.resumeVersionId !== "string") return null;
  const now = new Date().toISOString();
  return {
    id: item.id,
    resumeVersionId: item.resumeVersionId,
    targetRole: stringValue(item.targetRole),
    jobDescription: stringValue(item.jobDescription),
    overallScore: score(item.overallScore),
    keywordScore: score(item.keywordScore),
    impactScore: score(item.impactScore),
    clarityScore: score(item.clarityScore),
    technicalDepthScore: score(item.technicalDepthScore),
    missingKeywords: stringArray(item.missingKeywords),
    strongKeywords: stringArray(item.strongKeywords),
    weakBullets: stringArray(item.weakBullets),
    suggestedBulletRewrites: Array.isArray(item.suggestedBulletRewrites) ? item.suggestedBulletRewrites.map(rewrite).filter((entry): entry is { original: string; rewrite: string; rationale: string } => entry !== null) : [],
    strengths: stringArray(item.strengths),
    risks: stringArray(item.risks),
    recommendations: stringArray(item.recommendations),
    summary: stringValue(item.summary),
    provider: stringValue(item.provider) || "local",
    model: stringValue(item.model) || "local-mock",
    status: item.status === "failed" || item.status === "pending" ? item.status : "completed",
    errorMessage: stringValue(item.errorMessage),
    createdAt: stringValue(item.createdAt) || now,
    updatedAt: stringValue(item.updatedAt) || now,
  };
}

function rewrite(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return { original: stringValue(item.original), rewrite: stringValue(item.rewrite), rationale: stringValue(item.rationale) };
}

function browserStorage() {
  if (typeof window === "undefined") throw new Error("Local storage is only available in the browser.");
  return window.localStorage;
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function score(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0; }
