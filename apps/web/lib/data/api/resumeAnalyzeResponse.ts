import type { ApiResume, ApiResumeAnalysis } from "@/lib/data/api/contracts";
import { DataError } from "@/lib/data/errors";

export function parseAnalyzeData(response: unknown): { analysis: ApiResumeAnalysis; resume: ApiResume | null } {
  const data = readResponseData(response);
  const analysis = isRecord(data.analysis) ? data.analysis as ApiResumeAnalysis : null;
  if (!analysis || typeof analysis.id !== "string") {
    throw new DataError("API_ERROR", "OfferOS received an unexpected analysis response.");
  }
  const resume = isRecord(data.resume) && typeof data.resume.id === "string" ? data.resume as ApiResume : null;
  return { analysis, resume };
}

function readResponseData(response: unknown): Record<string, unknown> {
  if (!isRecord(response)) {
    throw new DataError("API_ERROR", "OfferOS received an unexpected response after analysis. Please refresh and try again.");
  }
  const data = "data" in response ? response.data : response;
  if (!isRecord(data)) {
    throw new DataError("API_ERROR", "OfferOS received an unexpected response after analysis. Please refresh and try again.");
  }
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
