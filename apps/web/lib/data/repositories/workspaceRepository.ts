import type { PrepWorkspaceData } from "@/lib/types";
import { applications, prepWorkspaceData, resumes } from "@/lib/mock-data";
import { toDataError } from "@/lib/data/errors";
import { writeApplications } from "@/lib/data/storage/local/applicationStorage";
import { writeResumes } from "@/lib/data/storage/local/resumeStorage";
import { writePrep } from "@/lib/data/storage/local/prepStorage";
import { clearOfferOSStorage, removePreference } from "@/lib/data/storage/local/preferencesStorage";

export type WorkspaceScope = "all" | "applications" | "resumes" | "prep";
const RECENTLY_VIEWED_KEY = "offeros:recently-viewed";

export const workspaceRepository = {
  async populateDemo() {
    try { writeApplications(applications); writeResumes(resumes); writePrep(prepWorkspaceData); }
    catch (error) { throw toDataError(error, "Unable to prepare the demo workspace."); }
  },
  async clear(scope: WorkspaceScope) {
    try {
      if (scope === "all") { clearOfferOSStorage(); return; }
      if (scope === "applications") writeApplications([]);
      if (scope === "resumes") writeResumes([]);
      if (scope === "prep") writePrep(emptyPrepWorkspace());
      removePreference(RECENTLY_VIEWED_KEY);
    } catch (error) { throw toDataError(error, `Unable to clear ${scope} data.`); }
  },
  async clearWorkspace() {
    try {
      writeApplications([]); writeResumes([]); writePrep(emptyPrepWorkspace());
      removePreference(RECENTLY_VIEWED_KEY);
      removePreference("offeros:recent-commands");
    } catch (error) { throw toDataError(error, "Unable to prepare a fresh workspace."); }
  },
};

function emptyPrepWorkspace(): PrepWorkspaceData {
  return {
    codingProblems: [], behavioralQuestions: [], systemDesignPrompts: [], sessions: [], weeklyDays: [],
    goals: prepWorkspaceData.goals.map((goal) => ({ ...goal, current: 0 })),
  };
}
