import type { PrepWorkspaceData } from "@/lib/types";
import { applications, prepWorkspaceData, resumes } from "@/lib/mock-data";
import { saveStoredApplications } from "@/lib/application-storage";
import { saveStoredResumes } from "@/lib/resume-storage";
import { saveStoredPrep } from "@/lib/prep-storage";

export const ONBOARDING_KEY = "offeros:onboarding-complete";
export const RECENTLY_VIEWED_KEY = "offeros:recently-viewed";
export const RECENT_COMMANDS_KEY = "offeros:recent-commands";

export function emptyPrepWorkspace(): PrepWorkspaceData {
  return {
    codingProblems: [],
    behavioralQuestions: [],
    systemDesignPrompts: [],
    sessions: [],
    weeklyDays: [],
    goals: prepWorkspaceData.goals.map((goal) => ({ ...goal, current: 0 })),
  };
}

export function populateDemoWorkspace() {
  saveStoredApplications(applications);
  saveStoredResumes(resumes);
  saveStoredPrep(prepWorkspaceData);
}

export function clearWorkspaceData() {
  saveStoredApplications([]);
  saveStoredResumes([]);
  saveStoredPrep(emptyPrepWorkspace());
  window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
  window.localStorage.removeItem(RECENT_COMMANDS_KEY);
}

export function clearAllOfferOSData() {
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith("offeros:")) window.localStorage.removeItem(key);
  }
}
