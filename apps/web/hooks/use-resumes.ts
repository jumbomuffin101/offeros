"use client";

import { useCallback } from "react";
import type { ResumeVersion } from "@/lib/types";
import type { ResumeAnalysisInput, ResumeInput } from "@/lib/data/types";
import { resumeRepository } from "@/lib/data/repositories/repositoryFactory";
import { useRepositoryResource } from "@/hooks/use-repository-resource";
import {
  mergeAnalyzedResume,
  validateResumeAnalysisResult,
} from "@/lib/resume-analysis-state";

const loadResumes = () => resumeRepository.list();

export function useResumes() {
  const resource = useRepositoryResource(loadResumes);
  const create = useCallback((input: ResumeInput) => resource.mutate(() => resumeRepository.create(input)), [resource]);
  const update = useCallback((id: string, input: Partial<ResumeInput>) => resource.mutate(() => resumeRepository.update(id, input)), [resource]);
  const remove = useCallback((id: string) => resource.mutate(() => resumeRepository.delete(id)), [resource]);
  const duplicate = useCallback((id: string) => resource.mutate(() => resumeRepository.duplicate(id)), [resource]);
  const toggleStatus = useCallback((resume: ResumeVersion) => update(resume.id, { status: resume.status === "Active" ? "Draft" : "Active" }), [update]);
  const reset = useCallback(() => resource.mutate(() => resumeRepository.reset()), [resource]);
  const updateResumeText = useCallback((resumeId: string, text: string) => resource.mutate(() => resumeRepository.updateResumeText(resumeId, text)), [resource]);
  const uploadResumeFile = useCallback(async (resumeId: string, file: File) => {
    if (!resumeRepository.uploadResumeFile) throw new Error("Resume upload is not available.");
    const result = await resumeRepository.uploadResumeFile(resumeId, file);
    await resource.refresh();
    return result;
  }, [resource]);
  const analyzeResume = useCallback(async (resumeId: string, payload: ResumeAnalysisInput) => {
    devResumeAnalysis("calling analyzeResume", { resumeId });
    const result = await resumeRepository.analyzeResume(resumeId, payload);
    validateResumeAnalysisResult(result);
    devResumeRefreshLog("analyze complete", { resumeId, analysisId: result.analysis.id, returnedResumeId: result.resume?.id ?? null });
    if (result.resume) {
      resource.patchData((current) => mergeAnalyzedResume(current, resumeId, result));
    }
    // The analyze response is authoritative. Avoid a follow-up list request
    // overwriting its fresh summary with a stale cache response.
    return result;
  }, [resource]);
  const listResumeAnalyses = useCallback((resumeId: string) => resumeRepository.listResumeAnalyses(resumeId), []);
  const getResumeAnalysis = useCallback((id: string) => resumeRepository.getResumeAnalysis(id), []);
  const deleteResumeAnalysis = useCallback(async (id: string, resumeId?: string) => {
    await resumeRepository.deleteResumeAnalysis(id);
    if (resumeId) {
      const updated = await resumeRepository.get(resumeId);
      if (updated) resource.patchData((current) => current?.map((resume) => resume.id === resumeId ? updated : resume) ?? current);
    }
    void resource.refreshSilently();
  }, [resource]);
  return {
    resumes: resource.data ?? [], loading: resource.loading, error: resource.error, refresh: resource.refresh,
    create, update, delete: remove, duplicate, toggleStatus, reset, updateResumeText,
    uploadResumeFile, analyzeResume, listResumeAnalyses, getResumeAnalysis, deleteResumeAnalysis,
  };
}

function devResumeRefreshLog(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[OfferOS Resume Refresh]", message, details);
}

function devResumeAnalysis(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(`[ResumeAnalysis] ${message}`, details);
}
