"use client";

import type { Application, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import { useDashboard } from "@/hooks/use-dashboard";

export type OfferOSData = {
  applications: Application[];
  resumes: ResumeVersion[];
  prep: PrepWorkspaceData;
  asOf: string;
  hydrated: boolean;
};

const fallbackAsOf = "2026-06-30T12:00:00.000Z";

export function useOfferOSData(): OfferOSData {
  const { summary } = useDashboard();
  return summary ? {
    applications: summary.applications,
    resumes: summary.resumes,
    prep: summary.prep,
    asOf: summary.asOf,
    hydrated: true,
  } : {
    applications: [],
    resumes: [],
    prep: { codingProblems: [], behavioralQuestions: [], systemDesignPrompts: [], sessions: [], weeklyDays: [], goals: [] },
    asOf: fallbackAsOf,
    hydrated: false,
  };
}
