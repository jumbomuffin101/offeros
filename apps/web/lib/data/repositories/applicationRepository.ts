import type { Application } from "@/lib/types";
import type { ApplicationInput } from "@/lib/data/types";
import type { ApplicationRepository } from "@/lib/data/types/repositories";
import { DataError, toDataError } from "@/lib/data/errors";
import { applications as demoApplications } from "@/lib/mock-data";
import { clearApplications, readApplications, writeApplications } from "@/lib/data/storage/local/applicationStorage";

export const applicationRepository: ApplicationRepository = {
  async list() {
    return read("Unable to load applications.");
  },
  async get(id) {
    return read("Unable to load the application.").find((item) => item.id === id) ?? null;
  },
  async create(input) {
    const now = new Date().toISOString();
    const application: Application = {
      ...input,
      id: `${slugify(input.company)}-${Date.now()}`,
      category: inferCategory(input),
      createdAt: now,
      updatedAt: now,
    };
    write([application, ...read("Unable to create the application.")], "Unable to create the application.");
    return application;
  },
  async update(id, input) {
    const items = read("Unable to update the application.");
    const existing = items.find((item) => item.id === id);
    if (!existing) throw new DataError("NOT_FOUND", "Application not found.");
    const updated: Application = {
      ...existing,
      ...input,
      category: inferCategory({ ...existing, ...input }),
      updatedAt: new Date().toISOString(),
    };
    write(items.map((item) => item.id === id ? updated : item), "Unable to update the application.");
    return updated;
  },
  async delete(id) {
    const items = read("Unable to delete the application.");
    if (!items.some((item) => item.id === id)) throw new DataError("NOT_FOUND", "Application not found.");
    write(items.filter((item) => item.id !== id), "Unable to delete the application.");
  },
  async duplicate(id) {
    const source = read("Unable to duplicate the application.").find((item) => item.id === id);
    if (!source) throw new DataError("NOT_FOUND", "Application not found.");
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, category: _category, ...input } = source;
    return this.create({ ...input, company: `${source.company} Copy` });
  },
  async reset() {
    try {
      clearApplications();
      return structuredClone(demoApplications);
    } catch (error) {
      throw toDataError(error, "Unable to reset applications.");
    }
  },
};

function read(message: string) {
  try { return readApplications(demoApplications); }
  catch (error) { throw toDataError(error, message); }
}
function write(items: Application[], message: string) {
  try { writeApplications(items); }
  catch (error) { throw toDataError(error, message); }
}
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "application"; }
function inferCategory(input: ApplicationInput | Application): Application["category"] {
  const content = [input.company, input.role, input.source, input.resumeUsed, input.notes, ...input.tags].join(" ").toLowerCase();
  if (content.includes("google") || content.includes("meta")) return "Big Tech";
  if (content.includes("finance") || content.includes("bank") || content.includes("quant")) return "Finance";
  if (content.includes("stripe") || content.includes("capital") || content.includes("payment")) return "Fintech";
  if (content.includes("data") || content.includes("observability")) return "Data";
  return "Startup";
}
