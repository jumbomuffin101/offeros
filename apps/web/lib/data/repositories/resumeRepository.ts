import type { ResumeAnalysis, ResumeVersion } from "@/lib/types";
import type { ResumeAnalysisInput } from "@/lib/data/types";
import type { ResumeRepository } from "@/lib/data/types/repositories";
import { DataError, toDataError } from "@/lib/data/errors";
import { resumes as demoResumes } from "@/lib/mock-data";
import { readResumes, writeResumes } from "@/lib/data/storage/local/resumeStorage";
import { readResumeAnalyses, writeResumeAnalyses } from "@/lib/data/storage/local/resumeAnalysisStorage";

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
    writeResumeAnalyses([]);
    return reset;
  },
  async analyzeResume(resumeId, payload) {
    const resume = await this.get(resumeId);
    if (!resume) throw new DataError("NOT_FOUND", "Resume not found.");
    const resumeText = (payload.resumeText || resume.extractedText || "").trim();
    if (!resumeText) throw new DataError("VALIDATION_ERROR", "Paste resume text before running AI analysis.");
    if (payload.resumeText && payload.resumeText.trim() !== resume.extractedText.trim()) {
      await this.update(resumeId, {
        extractedText: payload.resumeText.trim(),
        originalFileName: resume.originalFileName || resume.fileName,
        textExtractionStatus: "manual",
        textExtractionError: "",
      });
    }
    const analysis = localMockAnalysis(resumeId, resumeText, payload);
    writeResumeAnalyses([analysis, ...readResumeAnalyses()]);
    return analysis;
  },
  async listResumeAnalyses(resumeId) {
    return readResumeAnalyses().filter((analysis) => analysis.resumeVersionId === resumeId);
  },
  async getResumeAnalysis(id) {
    return readResumeAnalyses().find((analysis) => analysis.id === id) ?? null;
  },
  async deleteResumeAnalysis(id) {
    writeResumeAnalyses(readResumeAnalyses().filter((analysis) => analysis.id !== id));
  },
};

function read(message: string) { try { return readResumes(demoResumes); } catch (error) { throw toDataError(error, message); } }
function write(items: ResumeVersion[], message: string) { try { writeResumes(items); } catch (error) { throw toDataError(error, message); } }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume"; }
function timestampId(value: string) { return value.replace(/[^0-9]/g, ""); }

function localMockAnalysis(resumeId: string, resumeText: string, payload: ResumeAnalysisInput): ResumeAnalysis {
  const now = new Date().toISOString();
  const lowerResume = resumeText.toLowerCase();
  const context = `${payload.targetRole} ${payload.jobDescription}`.toLowerCase();
  const keywords = ["typescript", "react", "python", "fastapi", "postgresql", "sql", "aws", "docker", "testing", "api", "backend", "frontend", "system design"];
  const desired = keywords.filter((keyword) => context.includes(keyword));
  const strongKeywords = keywords.filter((keyword) => lowerResume.includes(keyword)).slice(0, 8);
  const missingKeywords = (desired.length ? desired : ["testing", "api", "system design"]).filter((keyword) => !lowerResume.includes(keyword)).slice(0, 8);
  const hasMetrics = /\d/.test(resumeText);
  const weakBullets = resumeText.split("\n").map((line) => line.trim()).filter((line) => /^[-•]/.test(line) && !/\d/.test(line)).slice(0, 3);
  const overallScore = clamp(76 + strongKeywords.length * 2 - missingKeywords.length * 3 + (hasMetrics ? 6 : 0));
  return {
    id: `local-analysis-${timestampId(now)}`,
    resumeVersionId: resumeId,
    targetRole: payload.targetRole,
    jobDescription: payload.jobDescription,
    overallScore,
    keywordScore: clamp(72 + strongKeywords.length * 3 - missingKeywords.length * 4),
    impactScore: hasMetrics ? 86 : 62,
    clarityScore: resumeText.length < 8000 ? 80 : 68,
    technicalDepthScore: clamp(70 + strongKeywords.filter((keyword) => ["fastapi", "postgresql", "docker", "aws"].includes(keyword)).length * 5),
    missingKeywords,
    strongKeywords: strongKeywords.length ? strongKeywords : ["software engineering"],
    weakBullets,
    suggestedBulletRewrites: weakBullets.map((bullet) => ({
      original: bullet,
      rewrite: `Rewrite with ownership, technical scope, and a quantified result: ${bullet}`,
      rationale: "Recruiters scan for scope, technologies, and measurable engineering impact.",
    })),
    strengths: ["Relevant SWE positioning is present.", "The resume can support role-specific tailoring."],
    risks: [hasMetrics ? "Keep metrics tied to engineering outcomes." : "Several bullets may need quantified impact.", missingKeywords.length ? "Some target-role keywords are missing." : "Avoid adding unsupported keywords."],
    recommendations: ["Add 2-3 quantified impact bullets.", "Mirror target-role technologies where accurate.", "Lead project bullets with action verbs and technical ownership."],
    summary: "Local mock analysis. Configure backend OpenAI settings in API mode for production AI feedback.",
    provider: "local",
    model: "local-mock",
    status: "completed",
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
  };
}

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
