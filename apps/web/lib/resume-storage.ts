import type { ResumeVersion } from "@/lib/types";
import { readResumes, RESUME_STORAGE_KEY, writeResumes } from "@/lib/data/storage/local/resumeStorage";

export { RESUME_STORAGE_KEY };

export function loadStoredResumes(fallback: ResumeVersion[]) {
  try {
    return readResumes(fallback);
  } catch {
    return fallback.map((resume) => ({ ...resume }));
  }
}

export function saveStoredResumes(resumes: ResumeVersion[]) {
  writeResumes(resumes);
}

export function resetStoredResumes(fallback: ResumeVersion[]) {
  const reset = fallback.map((resume) => ({ ...resume }));
  saveStoredResumes(reset);
  return reset;
}
