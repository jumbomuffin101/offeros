import type { BehavioralQuestion, CodingProblem, PrepWorkspaceData, SystemDesignPrompt } from "@/lib/types";
import type { PrepCreateInput, PrepItem, PrepUpdateInput } from "@/lib/data/types";
import type { PrepRepository } from "@/lib/data/types/repositories";
import { DataError, toDataError } from "@/lib/data/errors";
import { prepWorkspaceData } from "@/lib/mock-data";
import { timestampId, updateCompletion } from "@/lib/prep-utils";
import { readPrep, writePrep } from "@/lib/data/storage/local/prepStorage";
import { localBehavioralEvaluation, localComparison, localPortfolio, localStarCompleteness } from "@/lib/behavioral-coach";
import type { BehavioralEvaluation, BehavioralPracticeResult } from "@/lib/types";

const EVALUATION_KEY = "offeros.behavioral-evaluations.v1";
const PRACTICE_KEY = "offeros.behavioral-practice.v1";

export const prepRepository: PrepRepository = {
  async list() { return read("Unable to load prep workspace."); },
  async get(id) {
    const data = read("Unable to load the prep item.");
    return [...data.codingProblems, ...data.behavioralQuestions, ...data.systemDesignPrompts].find((item) => item.id === id) ?? null;
  },
  async create(input) {
    const data = read("Unable to create the prep item.");
    const now = new Date().toISOString();
    let item: PrepItem;
    let next: PrepWorkspaceData;
    if (input.type === "coding") {
      const coding: CodingProblem = { ...input.value, id: `coding-${timestampId(now)}`, completedAt: input.value.status === "Completed" ? now : "", createdAt: now, updatedAt: now };
      item = coding;
      next = updateCompletion({ ...data, codingProblems: [coding, ...data.codingProblems] }, coding.id, "coding", coding.status, now);
    } else if (input.type === "behavioral") {
      const base: BehavioralQuestion = { ...input.value, id: `behavioral-${timestampId(now)}`, createdAt: now, updatedAt: now };
      const completeness = localStarCompleteness(base);
      const behavioral: BehavioralQuestion = { ...base, starCompleteness: completeness, readinessStatus: completeness.score < 45 ? "draft" : completeness.score < 72 ? "needs_work" : "practice_ready", competencyTags: base.competencyTags ?? [] };
      item = behavioral;
      next = updateCompletion({ ...data, behavioralQuestions: [behavioral, ...data.behavioralQuestions] }, behavioral.id, "behavioral", behavioral.status, now);
    } else {
      const design: SystemDesignPrompt = { ...input.value, id: `system-${timestampId(now)}`, createdAt: now, updatedAt: now };
      item = design;
      next = updateCompletion({ ...data, systemDesignPrompts: [design, ...data.systemDesignPrompts] }, design.id, "systemDesign", design.status, now);
    }
    write(next, "Unable to create the prep item.");
    return item;
  },
  async update(id, input) {
    const data = read("Unable to update the prep item.");
    const now = new Date().toISOString();
    let item: PrepItem | null = null;
    let next = data;
    if (input.type === "coding") {
      const existing = data.codingProblems.find((value) => value.id === id);
      if (existing) {
        const status = input.value.status ?? existing.status;
        const coding = { ...existing, ...input.value, completedAt: status === "Completed" ? existing.completedAt || now : "", updatedAt: now };
        item = coding;
        next = updateCompletion({ ...data, codingProblems: data.codingProblems.map((value) => value.id === id ? coding : value) }, id, "coding", status, coding.completedAt || now);
      }
    } else if (input.type === "behavioral") {
      const existing = data.behavioralQuestions.find((value) => value.id === id);
      if (existing) {
        const base = { ...existing, ...input.value, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
        const completeness = localStarCompleteness(base);
        const behavioral = { ...base, starCompleteness: completeness, readinessStatus: completeness.score < 45 ? "draft" as const : completeness.score < 72 ? "needs_work" as const : base.readinessStatus ?? "practice_ready" as const };
        item = behavioral;
        next = updateCompletion({ ...data, behavioralQuestions: data.behavioralQuestions.map((value) => value.id === id ? behavioral : value) }, id, "behavioral", behavioral.status, now);
      }
    } else {
      const existing = data.systemDesignPrompts.find((value) => value.id === id);
      if (existing) {
        const design = { ...existing, ...input.value, updatedAt: now };
        item = design;
        next = updateCompletion({ ...data, systemDesignPrompts: data.systemDesignPrompts.map((value) => value.id === id ? design : value) }, id, "systemDesign", design.status, now);
      }
    }
    if (!item) throw new DataError("NOT_FOUND", "Prep item not found.");
    write(next, "Unable to update the prep item.");
    return item;
  },
  async delete(id) {
    const data = read("Unable to delete the prep item.");
    const exists = [...data.codingProblems, ...data.behavioralQuestions, ...data.systemDesignPrompts].some((item) => item.id === id);
    if (!exists) throw new DataError("NOT_FOUND", "Prep item not found.");
    write({
      ...data,
      codingProblems: data.codingProblems.filter((item) => item.id !== id),
      behavioralQuestions: data.behavioralQuestions.filter((item) => item.id !== id),
      systemDesignPrompts: data.systemDesignPrompts.filter((item) => item.id !== id),
      sessions: data.sessions.filter((session) => session.itemId !== id),
    }, "Unable to delete the prep item.");
  },
  async replace(data) { write(data, "Unable to save prep workspace."); return data; },
  async reset() { const reset = structuredClone(prepWorkspaceData); write(reset, "Unable to reset prep workspace."); window.localStorage.removeItem(EVALUATION_KEY); window.localStorage.removeItem(PRACTICE_KEY); return reset; },
  async evaluateBehavioral(storyId, input) {
    const data = read("Unable to evaluate behavioral story.");
    const story = data.behavioralQuestions.find((item) => item.id === storyId);
    if (!story) throw new DataError("NOT_FOUND", "Behavioral story not found.");
    const history = readLocal<BehavioralEvaluation[]>(EVALUATION_KEY, []);
    const result = localBehavioralEvaluation(story, input.competencyFocus);
    const now = new Date().toISOString();
    const evaluation: BehavioralEvaluation = { id: `behavioral-evaluation-${timestampId(now)}`, storyId, applicationId: input.applicationId ?? null, competencyFocus: input.competencyFocus ?? null, evaluation: result, comparison: localComparison(history.find((item) => item.storyId === storyId), result, input.competencyFocus), observationSummary: { simulated: true, scope: input.applicationId ? "application" : "story" }, provider: "local", model: "simulated-rules-v1", status: "completed", createdAt: now };
    writeLocal(EVALUATION_KEY, [evaluation, ...history]);
    const completeness = localStarCompleteness(story);
    const qualityAverage = Object.values(result.qualityScores).reduce((sum, value) => sum + value, 0) / 6;
    const updated: BehavioralQuestion = { ...story, competencyTags: result.competencies, starCompleteness: completeness, latestEvaluation: result, latestEvaluatedAt: now, evaluationSchemaVersion: "behavioral-evaluation-v1", trendSummary: evaluation.comparison, observationSummary: evaluation.observationSummary, readinessStatus: completeness.score < 45 ? "draft" : completeness.score < 72 || qualityAverage < 3 ? "needs_work" : "practice_ready", careerContextVersion: "local-simulated-v1", updatedAt: now };
    write({ ...data, behavioralQuestions: data.behavioralQuestions.map((item) => item.id === storyId ? updated : item) }, "Unable to save behavioral evaluation.");
    return { evaluation, story: updated };
  },
  async listBehavioralEvaluations(storyId) { return readLocal<BehavioralEvaluation[]>(EVALUATION_KEY, []).filter((item) => item.storyId === storyId); },
  async behavioralPortfolio() { return localPortfolio(read("Unable to load behavioral portfolio.").behavioralQuestions); },
  async practiceBehavioral(input) {
    const data = read("Unable to save behavioral practice."); const story = data.behavioralQuestions.find((item) => item.id === input.storyId);
    if (!story) throw new DataError("NOT_FOUND", "Choose a saved story before practicing in local mode.");
    const now = new Date().toISOString(); const result = localBehavioralEvaluation(story, input.competency, input.answer);
    const practice: BehavioralPracticeResult = { id: `behavioral-practice-${timestampId(now)}`, storyId: story.id, applicationId: input.applicationId ?? null, competency: input.competency, prompt: input.prompt, evaluation: result, status: "completed", completedAt: now, createdAt: now };
    writeLocal(PRACTICE_KEY, [practice, ...readLocal<BehavioralPracticeResult[]>(PRACTICE_KEY, [])]);
    return practice;
  },
};

function read(message: string) { try { return readPrep(prepWorkspaceData); } catch (error) { throw toDataError(error, message); } }
function write(data: PrepWorkspaceData, message: string) { try { writePrep(data); } catch (error) { throw toDataError(error, message); } }
function readLocal<T>(key: string, fallback: T): T { try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function writeLocal(key: string, value: unknown) { window.localStorage.setItem(key, JSON.stringify(value)); }

export type { PrepCreateInput, PrepUpdateInput };
