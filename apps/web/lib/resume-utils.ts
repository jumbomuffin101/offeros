import type { ResumeVersion } from "@/lib/types";

export type ResumeStatusFilter = "All" | ResumeVersion["status"];
export type ResumeSortKey = "updated" | "keyword" | "applications" | "name";

export function parseResumeList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function formatResumeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function filterResumes(
  resumes: ResumeVersion[],
  search: string,
  status: ResumeStatusFilter,
) {
  const query = search.trim().toLowerCase();
  return resumes.filter((resume) => {
    if (status !== "All" && resume.status !== status) return false;
    if (!query) return true;
    return [
      resume.name,
      resume.targetRole,
      resume.description,
      resume.notes,
      ...resume.tags,
      ...resume.strengths,
      ...resume.missingKeywords,
    ].some((value) => value.toLowerCase().includes(query));
  });
}

export function sortResumes(resumes: ResumeVersion[], sort: ResumeSortKey) {
  return [...resumes].sort((a, b) => {
    if (sort === "keyword") return b.keywordMatchScore - a.keywordMatchScore;
    if (sort === "applications") return b.applicationsUsed - a.applicationsUsed;
    if (sort === "name") return a.name.localeCompare(b.name);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function mostCommonMissingKeywords(resumes: ResumeVersion[], limit = 3) {
  const counts = new Map<string, number>();
  for (const keyword of resumes.flatMap((resume) => resume.missingKeywords)) {
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}
