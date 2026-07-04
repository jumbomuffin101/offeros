import type { BehavioralQuestion, CodingProblem, PrepWorkspaceData, SystemDesignPrompt } from "@/lib/types";
import type { PrepCreateInput, PrepItem, PrepUpdateInput } from "@/lib/data/types";
import type { PrepRepository } from "@/lib/data/types/repositories";
import { DataError, toDataError } from "@/lib/data/errors";
import { prepWorkspaceData } from "@/lib/mock-data";
import { timestampId, updateCompletion } from "@/lib/prep-utils";
import { readPrep, writePrep } from "@/lib/data/storage/local/prepStorage";

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
      const behavioral: BehavioralQuestion = { ...input.value, id: `behavioral-${timestampId(now)}`, createdAt: now, updatedAt: now };
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
        const behavioral = { ...existing, ...input.value, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
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
  async reset() { const reset = structuredClone(prepWorkspaceData); write(reset, "Unable to reset prep workspace."); return reset; },
};

function read(message: string) { try { return readPrep(prepWorkspaceData); } catch (error) { throw toDataError(error, message); } }
function write(data: PrepWorkspaceData, message: string) { try { writePrep(data); } catch (error) { throw toDataError(error, message); } }

export type { PrepCreateInput, PrepUpdateInput };
