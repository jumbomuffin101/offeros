import type { ResumeVersion } from "@/lib/types";
import { mostCommonMissingKeywords } from "@/lib/resume-utils";

export function isResumeAnalyzed(resume: ResumeVersion) {
  if (!resume.latestAnalysisId || resume.analysisStatus === "failed") return false;
  return resume.analysisStatus === "completed" || resume.latestOverallScore != null || Boolean(resume.lastAnalyzedAt);
}

export function buildResumeInsights(resumes: ResumeVersion[]) {
  const analyzed = resumes.filter(isResumeAnalyzed);
  const byKeyword = [...analyzed].sort((left, right) => right.keywordMatchScore - left.keywordMatchScore);
  const byOverall = [...analyzed].sort((left, right) => (right.latestOverallScore ?? 0) - (left.latestOverallScore ?? 0));
  const mostUsed = [...resumes].sort((left, right) => right.applicationsUsed - left.applicationsUsed)[0] ?? null;
  const mostRecent = [...analyzed].sort((left, right) => new Date(right.lastAnalyzedAt ?? 0).getTime() - new Date(left.lastAnalyzedAt ?? 0).getTime())[0] ?? null;
  const bestPerforming = [...analyzed]
    .filter((resume) => resume.applicationPerformance?.status === "sufficient")
    .sort((left, right) => (right.applicationPerformance?.interviewRate ?? 0) - (left.applicationPerformance?.interviewRate ?? 0))[0] ?? null;
  const weaknessCounts = new Map<string, number>();
  for (const resume of analyzed) for (const weakness of resume.recurringWeaknesses ?? []) weaknessCounts.set(weakness, (weaknessCounts.get(weakness) ?? 0) + 1);
  const recurringWeakness = [...weaknessCounts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "";

  return {
    analyzed,
    analysisCoverage: { current: analyzed.length, total: resumes.length },
    bestKeywordMatch: byKeyword[0] ?? null,
    bestOverallFit: byOverall[0] ?? null,
    mostUsed,
    bestPerforming,
    recurringWeakness,
    commonMissingKeywords: mostCommonMissingKeywords(analyzed, 5),
    topNextImprovement: mostRecent?.suggestedImprovement ?? "",
  };
}
