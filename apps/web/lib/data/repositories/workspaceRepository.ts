import type { PrepWorkspaceData } from "@/lib/types";
import { applications, prepWorkspaceData, resumes } from "@/lib/mock-data";
import { toDataError } from "@/lib/data/errors";
import { writeApplications } from "@/lib/data/storage/local/applicationStorage";
import { writeResumes } from "@/lib/data/storage/local/resumeStorage";
import { writePrep } from "@/lib/data/storage/local/prepStorage";
import { clearOfferOSStorage, removePreference } from "@/lib/data/storage/local/preferencesStorage";
import { writeResumeAnalyses } from "@/lib/data/storage/local/resumeAnalysisStorage";
import type { LocalImportStatus, WorkspaceRepository, WorkspaceScope } from "@/lib/data/types/repositories";

const RECENTLY_VIEWED_KEY = "offeros:recently-viewed";

export const workspaceRepository: WorkspaceRepository = {
  async reset(scope, mode) {
    if (mode === "demo") {
      try {
        if (scope === "all" || scope === "applications") writeApplications(applications);
        if (scope === "all" || scope === "resumes") { writeResumes(resumes); writeResumeAnalyses([]); }
        if (scope === "all" || scope === "prep") writePrep(prepWorkspaceData);
        return;
      } catch (error) { throw toDataError(error, `Unable to reset ${scope} data.`); }
    }
    return this.clear(scope);
  },
  async populateDemo() {
    try { writeApplications(applications); writeResumes(resumes); writePrep(prepWorkspaceData); }
    catch (error) { throw toDataError(error, "Unable to prepare the demo workspace."); }
  },
  async clear(scope: WorkspaceScope) {
    try {
      if (scope === "all") { clearOfferOSStorage(); return; }
      if (scope === "applications") writeApplications([]);
      if (scope === "resumes") { writeResumes([]); writeResumeAnalyses([]); }
      if (scope === "prep") writePrep(emptyPrepWorkspace());
      removePreference(RECENTLY_VIEWED_KEY);
    } catch (error) { throw toDataError(error, `Unable to clear ${scope} data.`); }
  },
  async clearWorkspace() {
    try {
      writeApplications([]); writeResumes([]); writeResumeAnalyses([]); writePrep(emptyPrepWorkspace());
      removePreference(RECENTLY_VIEWED_KEY);
      removePreference("offeros:recent-commands");
    } catch (error) { throw toDataError(error, "Unable to prepare a fresh workspace."); }
  },
  async getLocalImportStatus() {
    return emptyImportStatus();
  },
  async importLocalWorkspace() {
    return emptyImportStatus();
  },
};

function emptyPrepWorkspace(): PrepWorkspaceData {
  return {
    codingProblems: [], behavioralQuestions: [], systemDesignPrompts: [], sessions: [], weeklyDays: [],
    goals: prepWorkspaceData.goals.map((goal) => ({ ...goal, current: 0 })),
  };
}

function emptyImportStatus(): LocalImportStatus {
  return {
    available: false,
    applications: 0,
    resumes: 0,
    codingProblems: 0,
    behavioralQuestions: 0,
    systemDesignPrompts: 0,
  };
}
