import type { Application } from "@/lib/types";

const STORAGE_KEY = "offeros:applications";

export function loadStoredApplications(fallback: Application[]) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item, index) => normalizeApplication(item, fallback[index]))
      : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredApplications(applications: Application[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export function resetStoredApplications(fallback: Application[]) {
  if (typeof window === "undefined") {
    return fallback;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  return fallback;
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
    resumeUsed: stringValue(
      item.resumeUsed,
      stringValue(item.resume, fallback?.resumeUsed ?? "General SWE Resume"),
    ),
    jobUrl: stringValue(item.jobUrl, fallback?.jobUrl ?? ""),
    recruiterName: stringValue(item.recruiterName, fallback?.recruiterName ?? ""),
    recruiterEmail: stringValue(item.recruiterEmail, fallback?.recruiterEmail ?? ""),
    salaryRange: stringValue(item.salaryRange, fallback?.salaryRange ?? ""),
    priority: stringValue(item.priority, fallback?.priority ?? "Medium") as Application["priority"],
    notes: stringValue(item.notes, fallback?.notes ?? ""),
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag) => String(tag)).filter(Boolean)
      : fallback?.tags ?? [],
    createdAt: stringValue(item.createdAt, fallback?.createdAt ?? now),
    updatedAt: stringValue(item.updatedAt, fallback?.updatedAt ?? now),
    category: stringValue(item.category, fallback?.category ?? "Startup") as Application["category"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}
