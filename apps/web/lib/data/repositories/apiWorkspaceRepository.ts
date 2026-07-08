import type { Application, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import type { LocalImportStatus, WorkspaceRepository, WorkspaceResetMode, WorkspaceScope } from "@/lib/data/types/repositories";
import { prepWorkspaceData } from "@/lib/mock-data";
import { readApplications } from "@/lib/data/storage/local/applicationStorage";
import { readPrep } from "@/lib/data/storage/local/prepStorage";
import { readResumes } from "@/lib/data/storage/local/resumeStorage";
import { removePreference } from "@/lib/data/storage/local/preferencesStorage";
import { apiApplicationRepository } from "@/lib/data/repositories/apiApplicationRepository";
import { apiPrepRepository } from "@/lib/data/repositories/apiPrepRepository";
import { apiResumeRepository } from "@/lib/data/repositories/apiResumeRepository";
import { writeApiPrepGoals } from "@/lib/data/storage/local/apiPrepStorage";
import { resetApiWorkspace } from "@/lib/data/repositories/apiWorkspaceReset";

const RECENTLY_VIEWED_KEY = "offeros:recently-viewed";

export const apiWorkspaceRepository: WorkspaceRepository = {
  async reset(scope, mode) {
    return resetCloudWorkspace(scope, mode);
  },
  async populateDemo() {
    await resetCloudWorkspace("all", "sample");
  },
  async clear(scope, mode = "empty") {
    await resetCloudWorkspace(scope, mode);
  },
  async clearWorkspace() {
    await resetCloudWorkspace("all", "empty");
    removePreference(RECENTLY_VIEWED_KEY);
    removePreference("offeros:recent-commands");
  },
  async getLocalImportStatus() {
    return summarizeLocalSnapshot(readLocalSnapshot());
  },
  async importLocalWorkspace() {
    const snapshot = readLocalSnapshot();
    const status = summarizeLocalSnapshot(snapshot);
    if (!status.available) return status;

    const [cloudApplications, cloudResumes, cloudPrep] = await Promise.all([
      apiApplicationRepository.list(),
      apiResumeRepository.list(),
      apiPrepRepository.list(),
    ]);

    const applicationKeys = new Set(cloudApplications.map(applicationKey));
    const resumeKeys = new Set(cloudResumes.map(resumeKey));
    const codingKeys = new Set(cloudPrep.codingProblems.map((item) => item.title.trim().toLowerCase()));
    const behavioralKeys = new Set(cloudPrep.behavioralQuestions.map((item) => item.question.trim().toLowerCase()));
    const systemKeys = new Set(cloudPrep.systemDesignPrompts.map((item) => item.title.trim().toLowerCase()));

    const imported: LocalImportStatus = emptyImportStatus();
    for (const application of snapshot.applications) {
      const key = applicationKey(application);
      if (applicationKeys.has(key)) continue;
      const { id: _id, category: _category, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = application;
      await apiApplicationRepository.create(input);
      applicationKeys.add(key);
      imported.applications += 1;
    }
    for (const resume of snapshot.resumes) {
      const key = resumeKey(resume);
      if (resumeKeys.has(key)) continue;
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, lastUpdated: _lastUpdated, ...input } = resume;
      await apiResumeRepository.create(input);
      resumeKeys.add(key);
      imported.resumes += 1;
    }
    for (const problem of snapshot.prep.codingProblems) {
      const key = problem.title.trim().toLowerCase();
      if (codingKeys.has(key)) continue;
      const { id: _id, completedAt: _completedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...value } = problem;
      await apiPrepRepository.create({ type: "coding", value });
      codingKeys.add(key);
      imported.codingProblems += 1;
    }
    for (const question of snapshot.prep.behavioralQuestions) {
      const key = question.question.trim().toLowerCase();
      if (behavioralKeys.has(key)) continue;
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...value } = question;
      await apiPrepRepository.create({ type: "behavioral", value });
      behavioralKeys.add(key);
      imported.behavioralQuestions += 1;
    }
    for (const prompt of snapshot.prep.systemDesignPrompts) {
      const key = prompt.title.trim().toLowerCase();
      if (systemKeys.has(key)) continue;
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...value } = prompt;
      await apiPrepRepository.create({ type: "systemDesign", value });
      systemKeys.add(key);
      imported.systemDesignPrompts += 1;
    }
    if (snapshot.prep.goals.length > 0) writeApiPrepGoals(snapshot.prep.goals);
    imported.available = Object.values(imported).some((value) => typeof value === "number" && value > 0);
    return imported;
  },
};

async function resetCloudWorkspace(scope: WorkspaceScope, mode: WorkspaceResetMode) {
  const response = await resetApiWorkspace(scope, mode);
  if (scope === "all" || scope === "prep") writeApiPrepGoals(mode === "sample" ? prepWorkspaceData.goals : []);
  return response;
}

type WorkspaceSnapshot = {
  applications: Application[];
  resumes: ResumeVersion[];
  prep: PrepWorkspaceData;
};

function readLocalSnapshot(): WorkspaceSnapshot {
  return {
    applications: readApplications([]),
    resumes: readResumes([]),
    prep: readPrep(emptyPrepWorkspace()),
  };
}

function summarizeLocalSnapshot(snapshot: WorkspaceSnapshot): LocalImportStatus {
  const status = {
    available: false,
    applications: snapshot.applications.length,
    resumes: snapshot.resumes.length,
    codingProblems: snapshot.prep.codingProblems.length,
    behavioralQuestions: snapshot.prep.behavioralQuestions.length,
    systemDesignPrompts: snapshot.prep.systemDesignPrompts.length,
  };
  status.available = status.applications + status.resumes + status.codingProblems + status.behavioralQuestions + status.systemDesignPrompts > 0;
  return status;
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

function emptyPrepWorkspace(): PrepWorkspaceData {
  return {
    codingProblems: [],
    behavioralQuestions: [],
    systemDesignPrompts: [],
    sessions: [],
    weeklyDays: [],
    goals: [],
  };
}

function applicationKey(application: Application) {
  return [
    application.company,
    application.role,
    application.jobUrl,
    application.deadline,
  ].map((value) => value.trim().toLowerCase()).join("|");
}

function resumeKey(resume: ResumeVersion) {
  return [resume.name, resume.targetRole, resume.fileName].map((value) => value.trim().toLowerCase()).join("|");
}
