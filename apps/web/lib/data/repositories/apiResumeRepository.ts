import type { ResumeRepository } from "@/lib/data/types/repositories";
import type { ApiDataResponse, ApiResume, ApiResumeAnalysis, ApiResumeUploadResponse } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiResume, fromApiResumeAnalysis, toApiResume, toApiResumeAnalysis } from "@/lib/data/api/mappers";
import { parseAnalyzeData } from "@/lib/data/api/resumeAnalyzeResponse";
import { resumeAnalyzePath } from "@/lib/data/api/resumeAnalyzeRequest";
import { RESUME_ANALYSIS_TIMEOUT_MESSAGE, RESUME_ANALYSIS_TIMEOUT_MS, RESUME_UPLOAD_TIMEOUT_MS } from "@/lib/data/api/request-timeouts";
import { resetApiWorkspace } from "@/lib/data/repositories/apiWorkspaceReset";

export const apiResumeRepository: ResumeRepository = {
  async list() {
    const response = await apiClient.get<ApiDataResponse<ApiResume[]>>("/resumes");
    return response.data.map(fromApiResume);
  },
  async get(id) {
    const response = await apiClient.get<ApiDataResponse<ApiResume>>(`/resumes/${id}`);
    return fromApiResume(response.data);
  },
  async create(input) {
    const response = await apiClient.post<ApiDataResponse<ApiResume>>("/resumes", toApiResume(input));
    return fromApiResume(response.data);
  },
  async update(id, input) {
    const response = await apiClient.patch<ApiDataResponse<ApiResume>>(`/resumes/${id}`, toApiResume(input));
    return fromApiResume(response.data);
  },
  async delete(id) {
    await apiClient.delete(`/resumes/${id}`);
  },
  async duplicate(id) {
    const response = await apiClient.post<ApiDataResponse<ApiResume>>(`/resumes/${id}/duplicate`, {});
    return fromApiResume(response.data);
  },
  async reset() {
    await resetApiWorkspace("resumes", "sample");
    return this.list();
  },
  async updateResumeText(resumeId, text) {
    const response = await apiClient.patch<ApiDataResponse<ApiResume>>(`/resumes/${resumeId}`, toApiResume({
      extractedText: text,
      textExtractionStatus: text.trim() ? "manual" : "not_started",
      textExtractionError: "",
    }));
    return fromApiResume(response.data);
  },
  async uploadResumeFile(resumeId, file) {
    const body = new FormData();
    body.append("file", file);
    const response = await apiClient.post<ApiDataResponse<ApiResumeUploadResponse>, FormData>(`/resumes/${resumeId}/upload`, body, {
      timeoutMs: RESUME_UPLOAD_TIMEOUT_MS,
      timeoutMessage: "Resume upload is taking longer than expected. Please try again.",
    });
    return {
      resume: fromApiResume(response.data.resume),
      extraction: {
        text: response.data.extraction.text,
        pageCount: response.data.extraction.page_count,
        characterCount: response.data.extraction.character_count,
        status: response.data.extraction.status,
        warnings: response.data.extraction.warnings,
      },
    };
  },
  async analyzeResume(resumeId, payload) {
    devAnalysisLog("request started", { resumeId, path: resumeAnalyzePath(resumeId) });
    let response: unknown;
    try {
      response = await apiClient.post<unknown>(
        resumeAnalyzePath(resumeId),
        toApiResumeAnalysis(payload),
        {
          timeoutMs: RESUME_ANALYSIS_TIMEOUT_MS,
          timeoutMessage: RESUME_ANALYSIS_TIMEOUT_MESSAGE,
          headers: payload.analysisRequestId ? { "Idempotency-Key": payload.analysisRequestId } : undefined,
        },
      );
    } catch (cause) {
      devAnalysisLog("request failed", { resumeId, message: cause instanceof Error ? cause.message : "Unknown error" });
      throw cause;
    }
    devAnalysisResponseShape(response);
    const data = parseAnalyzeData(response);
    const analysis = fromApiResumeAnalysis(data.analysis);
    const resume = fromApiResume(data.resume);
    devAnalysisLog("request completed", {
      resumeId: resume.id,
      analysisId: analysis.id,
      resumeIncluded: true,
    });
    return { analysis, resume };
  },
  async listResumeAnalyses(resumeId) {
    const response = await apiClient.get<ApiDataResponse<ApiResumeAnalysis[]>>(`/resumes/${resumeId}/analyses`);
    return response.data.map(fromApiResumeAnalysis);
  },
  async getResumeAnalysis(id) {
    const response = await apiClient.get<ApiDataResponse<ApiResumeAnalysis>>(`/resume-analyses/${id}`);
    return fromApiResumeAnalysis(response.data);
  },
  async deleteResumeAnalysis(id) {
    await apiClient.delete(`/resume-analyses/${id}`);
  },
};

function devAnalysisLog(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[OfferOS Resume Analysis]", message, details);
}

function devAnalysisResponseShape(response: unknown) {
  if (process.env.NODE_ENV !== "development" || !response || typeof response !== "object") return;
  const body = response as Record<string, unknown>;
  const analysis = body.analysis && typeof body.analysis === "object" ? body.analysis as Record<string, unknown> : null;
  const resume = body.resume && typeof body.resume === "object" ? body.resume as Record<string, unknown> : null;
  console.debug("[OfferOS Resume Analysis] response shape", {
    rootKeys: Object.keys(body),
    analysisKeys: analysis ? Object.keys(analysis) : [],
    resumeKeys: resume ? Object.keys(resume) : [],
  });
}
