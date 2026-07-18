import type { Application } from "@/lib/types";

export const APPLICATION_STORAGE_KEY = "offeros:applications";

export function readApplications(fallback: Application[]) {
  const storage = browserStorage();
  const stored = storage.getItem(APPLICATION_STORAGE_KEY);
  if (!stored) return clone(fallback);
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item, index) => normalizeApplication(item, fallback[index]))
      : clone(fallback);
  } catch { return clone(fallback); }
}

export function writeApplications(applications: Application[]) {
  browserStorage().setItem(APPLICATION_STORAGE_KEY, JSON.stringify(applications));
}

export function clearApplications() {
  browserStorage().removeItem(APPLICATION_STORAGE_KEY);
}

function normalizeApplication(value: unknown, fallback?: Application): Application {
  const item = isRecord(value) ? value : {};
  const now = new Date().toISOString();
  return {
    id: stringValue(item.id, fallback?.id ?? `application-${Date.now()}`),
    company: stringValue(item.company, fallback?.company ?? ""),
    role: stringValue(item.role, fallback?.role ?? ""),
    location: stringValue(item.location, fallback?.location ?? ""),
    status: stringValue(item.status, fallback?.status ?? "Wishlist") as Application["status"],
    dateApplied: stringValue(item.dateApplied, fallback?.dateApplied ?? ""),
    deadline: stringValue(item.deadline, fallback?.deadline ?? ""),
    source: stringValue(item.source, fallback?.source ?? ""),
    resumeUsed: stringValue(item.resumeUsed, stringValue(item.resume, fallback?.resumeUsed ?? "General SWE Resume")),
    resumeVersionId: stringValue(item.resumeVersionId, fallback?.resumeVersionId ?? ""),
    resumeAnalysisId: stringValue(item.resumeAnalysisId, fallback?.resumeAnalysisId ?? ""),
    jobDescription: stringValue(item.jobDescription, fallback?.jobDescription ?? ""),
    selectedResumeName: stringValue(item.selectedResumeName, fallback?.selectedResumeName ?? ""),
    selectedResumeTargetRole: stringValue(item.selectedResumeTargetRole, fallback?.selectedResumeTargetRole ?? ""),
    analysisStatus: stringValue(item.analysisStatus, fallback?.analysisStatus ?? "") as Application["analysisStatus"],
    analysisOverallScore: numberValue(item.analysisOverallScore, fallback?.analysisOverallScore),
    analysisKeywordScore: numberValue(item.analysisKeywordScore, fallback?.analysisKeywordScore),
    analysisMissingKeywordCount: numberValue(item.analysisMissingKeywordCount, fallback?.analysisMissingKeywordCount) ?? 0,
    analysisLastAnalyzedAt: stringValue(item.analysisLastAnalyzedAt, fallback?.analysisLastAnalyzedAt ?? ""),
    jobUrl: stringValue(item.jobUrl, fallback?.jobUrl ?? ""),
    recruiterName: stringValue(item.recruiterName, fallback?.recruiterName ?? ""),
    recruiterEmail: stringValue(item.recruiterEmail, fallback?.recruiterEmail ?? ""),
    salaryRange: stringValue(item.salaryRange, fallback?.salaryRange ?? ""),
    priority: stringValue(item.priority, fallback?.priority ?? "Medium") as Application["priority"],
    notes: stringValue(item.notes, fallback?.notes ?? ""),
    tags: Array.isArray(item.tags) ? item.tags.map(String).filter(Boolean) : fallback?.tags ?? [],
    createdAt: stringValue(item.createdAt, fallback?.createdAt ?? now),
    updatedAt: stringValue(item.updatedAt, fallback?.updatedAt ?? now),
    category: stringValue(item.category, fallback?.category ?? "Startup") as Application["category"],
  };
}

function browserStorage() {
  if (typeof window === "undefined") throw new Error("Local storage is only available in the browser.");
  return window.localStorage;
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function stringValue(value: unknown, fallback: string) { return typeof value === "string" ? value : fallback; }
function numberValue(value: unknown, fallback: number | undefined) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
