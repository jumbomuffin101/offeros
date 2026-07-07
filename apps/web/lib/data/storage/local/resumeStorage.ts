import type { ResumeVersion } from "@/lib/types";

export const RESUME_STORAGE_KEY = "offeros:resumes";

export function readResumes(fallback: ResumeVersion[]) {
  const raw = browserStorage().getItem(RESUME_STORAGE_KEY);
  if (!raw) return clone(fallback);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return clone(fallback);
    return parsed.map(normalizeResume).filter((resume): resume is ResumeVersion => resume !== null);
  } catch { return clone(fallback); }
}

export function writeResumes(resumes: ResumeVersion[]) {
  browserStorage().setItem(RESUME_STORAGE_KEY, JSON.stringify(resumes));
}

export function clearResumes() { browserStorage().removeItem(RESUME_STORAGE_KEY); }

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
    tags: stringArray(item.tags), strengths: stringArray(item.strengths),
    weaknesses: stringArray(item.weaknesses), missingKeywords: stringArray(item.missingKeywords),
    suggestedImprovement: stringValue(item.suggestedImprovement), notes: stringValue(item.notes),
    fileName: stringValue(item.fileName),
    originalFileName: stringValue(item.originalFileName) || stringValue(item.fileName),
    extractedText: stringValue(item.extractedText),
    textExtractionStatus: resumeTextStatus(item.textExtractionStatus),
    textExtractionError: stringValue(item.textExtractionError),
    createdAt: stringValue(item.createdAt) || updatedAt, updatedAt,
  };
}

function browserStorage() { if (typeof window === "undefined") throw new Error("Local storage is only available in the browser."); return window.localStorage; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function numberValue(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function dateFromLegacy(value: unknown) { if (typeof value !== "string" || !value) return ""; const parsed = new Date(`${value}, ${new Date().getFullYear()}`); return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString(); }
function resumeTextStatus(value: unknown): ResumeVersion["textExtractionStatus"] {
  return value === "manual" || value === "parsed" || value === "failed" ? value : "not_started";
}
