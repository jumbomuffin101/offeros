import type { Application } from "@/lib/types";
import { clearApplications, readApplications, writeApplications } from "@/lib/data/storage/local/applicationStorage";

export function loadStoredApplications(fallback: Application[]) { try { return readApplications(fallback); } catch { return fallback; } }
export function saveStoredApplications(applications: Application[]) { writeApplications(applications); }
export function resetStoredApplications(fallback: Application[]) { clearApplications(); return fallback; }
