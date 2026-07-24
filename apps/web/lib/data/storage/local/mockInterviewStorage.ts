import type { MockInterviewSession } from "@/lib/types";

export type StoredMockInterview = MockInterviewSession & {
  currentFollowUpCount: number;
  processedAnswerIds: string[];
};

const STORAGE_KEY = "offeros.mock-interviews.v1";

export function readMockInterviews(): StoredMockInterview[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMockInterviews(value: StoredMockInterview[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
}

export function clearMockInterviews() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
