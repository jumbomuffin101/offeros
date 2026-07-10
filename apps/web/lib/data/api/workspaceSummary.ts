import type { Application, PrepSession, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import type { ApiWorkspaceSummary } from "@/lib/data/api/contracts";
import { fromApiApplication, fromApiBehavioral, fromApiCoding, fromApiResume, fromApiSystemDesign } from "@/lib/data/api/mappers";
import { readApiPrepGoals } from "@/lib/data/storage/local/apiPrepStorage";
import { prepWorkspaceData } from "@/lib/mock-data";
import { buildWeeklyDays } from "@/lib/prep-utils";

export type WorkspaceSummaryData = {
  applications: Application[];
  resumes: ResumeVersion[];
  prep: PrepWorkspaceData;
};

export function fromApiWorkspaceSummary(value: ApiWorkspaceSummary): WorkspaceSummaryData {
  const codingProblems = value.coding_problems.map(fromApiCoding);
  const behavioralQuestions = value.behavioral_questions.map(fromApiBehavioral);
  const systemDesignPrompts = value.system_design_prompts.map(fromApiSystemDesign);
  const sessions: PrepSession[] = [
    ...codingProblems
      .filter((item) => item.status === "Completed")
      .map((item) => ({
        id: `coding-${item.id}`,
        itemId: item.id,
        type: "coding" as const,
        completedAt: item.completedAt || item.updatedAt,
      })),
    ...behavioralQuestions
      .filter((item) => item.status === "Completed")
      .map((item) => ({
        id: `behavioral-${item.id}`,
        itemId: item.id,
        type: "behavioral" as const,
        completedAt: item.updatedAt,
      })),
    ...systemDesignPrompts
      .filter((item) => item.status === "Completed")
      .map((item) => ({
        id: `system-${item.id}`,
        itemId: item.id,
        type: "systemDesign" as const,
        completedAt: item.updatedAt,
      })),
  ];

  return {
    applications: value.applications.map(fromApiApplication),
    resumes: value.resumes.map(fromApiResume),
    prep: {
      codingProblems,
      behavioralQuestions,
      systemDesignPrompts,
      sessions,
      weeklyDays: buildWeeklyDays(sessions),
      goals: readApiPrepGoals(prepWorkspaceData.goals),
    },
  };
}
