import type { PrepWorkspaceData } from "@/lib/types";
import { prepWorkspaceData } from "@/lib/mock-data";
import { workspaceRepository } from "@/lib/data/repositories/repositoryFactory";

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

export function populateDemoWorkspace() { return workspaceRepository.reset("all", "demo"); }

export function clearWorkspaceData() { return workspaceRepository.clearWorkspace(); }

export function clearAllOfferOSData() { return workspaceRepository.reset("all", "empty"); }
