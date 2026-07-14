import type { DataError } from "@/lib/data/errors";

export function shouldShowResumeFatalError({
  error,
  resumeCount,
  selectedResumeId,
  latestAnalysisStatus,
}: {
  error: DataError | null;
  resumeCount: number;
  selectedResumeId: string | null;
  latestAnalysisStatus?: string | null;
}) {
  if (!error) return false;
  if (selectedResumeId) return false;
  if (latestAnalysisStatus === "completed") return false;
  return resumeCount === 0;
}
