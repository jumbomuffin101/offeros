import type { ResumeVersion } from "@/lib/types";

export const RESUME_STORAGE_KEY = "offeros:resumes";

export function loadStoredResumes(fallback: ResumeVersion[]) {
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return fallback.map((resume) => ({ ...resume }));
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback.map((resume) => ({ ...resume }));
    return parsed.map(normalizeResume).filter((resume): resume is ResumeVersion => resume !== null);
  } catch {
    return fallback.map((resume) => ({ ...resume }));
  }
}

export function saveStoredResumes(resumes: ResumeVersion[]) {
  window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resumes));
}

export function resetStoredResumes(fallback: ResumeVersion[]) {
  const reset = fallback.map((resume) => ({ ...resume }));
  saveStoredResumes(reset);
  return reset;
}

function normalizeResume(value: unknown): ResumeVersion | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string") return null;
  const now = new Date().toISOString();
  const description = stringValue(item.description) || stringValue(item.focus);
  const updatedAt = stringValue(item.updatedAt) || dateFromLegacy(item.lastUpdated) || now;
  return {
    id: item.id,
    name: item.name,
    targetRole: stringValue(item.targetRole) || "Software Engineer",
    description,
    status: item.status === "Draft" ? "Draft" : "Active",
    lastUpdated: stringValue(item.lastUpdated) || updatedAt,
    applicationsUsed: numberValue(item.applicationsUsed, numberValue(item.applicationsUsedFor, 0)),
    keywordMatchScore: Math.min(100, Math.max(0, numberValue(item.keywordMatchScore, 0))),
    tags: stringArray(item.tags),
    strengths: stringArray(item.strengths),
    weaknesses: stringArray(item.weaknesses),
    missingKeywords: stringArray(item.missingKeywords),
    suggestedImprovement: stringValue(item.suggestedImprovement),
    notes: stringValue(item.notes),
    fileName: stringValue(item.fileName),
    createdAt: stringValue(item.createdAt) || updatedAt,
    updatedAt,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function dateFromLegacy(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(`${value}, ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
