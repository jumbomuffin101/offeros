import type { ResumeVersion } from "@/lib/types";
import type { ResumeRepository } from "@/lib/data/types/repositories";
import { DataError, toDataError } from "@/lib/data/errors";
import { resumes as demoResumes } from "@/lib/mock-data";
import { readResumes, writeResumes } from "@/lib/data/storage/local/resumeStorage";

export const resumeRepository: ResumeRepository = {
  async list() { return read("Unable to load resumes."); },
  async get(id) { return read("Unable to load the resume.").find((item) => item.id === id) ?? null; },
  async create(input) {
    const now = new Date().toISOString();
    const resume: ResumeVersion = { ...input, id: `${slugify(input.name)}-${timestampId(now)}`, createdAt: now, updatedAt: now, lastUpdated: now };
    write([resume, ...read("Unable to create the resume.")], "Unable to create the resume.");
    return resume;
  },
  async update(id, input) {
    const items = read("Unable to update the resume.");
    const existing = items.find((item) => item.id === id);
    if (!existing) throw new DataError("NOT_FOUND", "Resume not found.");
    const now = new Date().toISOString();
    const updated = { ...existing, ...input, updatedAt: now, lastUpdated: now };
    write(items.map((item) => item.id === id ? updated : item), "Unable to update the resume.");
    return updated;
  },
  async delete(id) {
    const items = read("Unable to delete the resume.");
    if (!items.some((item) => item.id === id)) throw new DataError("NOT_FOUND", "Resume not found.");
    write(items.filter((item) => item.id !== id), "Unable to delete the resume.");
  },
  async duplicate(id) {
    const source = read("Unable to duplicate the resume.").find((item) => item.id === id);
    if (!source) throw new DataError("NOT_FOUND", "Resume not found.");
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, lastUpdated: _lastUpdated, ...input } = source;
    return this.create({ ...input, name: `${source.name} Copy`, status: "Draft", applicationsUsed: 0 });
  },
  async reset() {
    const reset = structuredClone(demoResumes);
    write(reset, "Unable to reset resumes.");
    return reset;
  },
};

function read(message: string) { try { return readResumes(demoResumes); } catch (error) { throw toDataError(error, message); } }
function write(items: ResumeVersion[], message: string) { try { writeResumes(items); } catch (error) { throw toDataError(error, message); } }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume"; }
function timestampId(value: string) { return value.replace(/[^0-9]/g, ""); }
