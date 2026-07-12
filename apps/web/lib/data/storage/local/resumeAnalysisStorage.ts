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
    companyName: stringValue(item.companyName),
    targetRole: stringValue(item.targetRole),
    jobDescription: stringValue(item.jobDescription),
    inputResumeHash: stringValue(item.inputResumeHash),
    overallScore: score(item.overallScore),
    keywordScore: score(item.keywordScore),
    impactScore: score(item.impactScore),
    clarityScore: score(item.clarityScore),
    technicalDepthScore: score(item.technicalDepthScore),
    experienceMatchScore: score(item.experienceMatchScore),
    requiredSkillsMatch: skillMatches(item.requiredSkillsMatch),
    preferredSkillsMatch: skillMatches(item.preferredSkillsMatch),
    missingKeywords: stringArray(item.missingKeywords),
    strongKeywords: stringArray(item.strongKeywords),
    weakBullets: weakBullets(item.weakBullets),
    suggestedBulletRewrites: Array.isArray(item.suggestedBulletRewrites) ? item.suggestedBulletRewrites.map(rewrite).filter((entry): entry is ResumeAnalysis["suggestedBulletRewrites"][number] => entry !== null) : [],
    strengths: stringArray(item.strengths),
    risks: stringArray(item.risks),
    recommendations: stringArray(item.recommendations),
    recruiterSummary: stringValue(item.recruiterSummary) || stringValue(item.summary),
    summary: stringValue(item.summary),
    provider: stringValue(item.provider) || "local",
    model: stringValue(item.model) || "local-mock",
    status: item.status === "failed" || item.status === "pending" ? item.status : "completed",
    errorMessage: stringValue(item.errorMessage),
    createdAt: stringValue(item.createdAt) || now,
    updatedAt: stringValue(item.updatedAt) || now,
  };
}

function rewrite(value: unknown): ResumeAnalysis["suggestedBulletRewrites"][number] | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return {
    original: stringValue(item.original),
    rewrite: stringValue(item.rewrite),
    whyBetter: stringValue(item.whyBetter) || stringValue(item.rationale),
    groundedInResume: typeof item.groundedInResume === "boolean" ? item.groundedInResume : true,
  };
}

function skillMatches(value: unknown): ResumeAnalysis["requiredSkillsMatch"] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return { skill: entry, status: "missing" as const, evidence: null };
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    const status = item.status === "strong" || item.status === "partial" ? item.status : "missing";
    return {
      skill: stringValue(item.skill),
      status,
      evidence: typeof item.evidence === "string" ? item.evidence : null,
    };
  }).filter((entry): entry is ResumeAnalysis["requiredSkillsMatch"][number] => entry !== null);
}

function weakBullets(value: unknown): ResumeAnalysis["weakBullets"] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") {
      return {
        original: entry,
        issue: "This bullet needs clearer technical scope or impact.",
        suggestion: "Add technologies, ownership, and measurable outcome.",
      };
    }
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    return {
      original: stringValue(item.original),
      issue: stringValue(item.issue),
      suggestion: stringValue(item.suggestion),
    };
  }).filter((entry): entry is ResumeAnalysis["weakBullets"][number] => entry !== null);
}

function browserStorage() {
  if (typeof window === "undefined") throw new Error("Local storage is only available in the browser.");
  return window.localStorage;
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function score(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0; }
