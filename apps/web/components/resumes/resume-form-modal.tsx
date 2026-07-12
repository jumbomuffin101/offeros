"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { FileCheck2, FileUp, X } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import type { ResumeInput } from "@/lib/data/types";
import { parseResumeList } from "@/lib/resume-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { cn } from "@/lib/utils";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";

export type ResumeFormPayload = ResumeInput & { uploadFile?: File };
export type ResumeSubmitStatus = "idle" | "creating" | "saving" | "uploading" | "extracting" | "ready";

const emptyForm: ResumeFormPayload = {
  name: "", targetRole: "", description: "", status: "Draft", applicationsUsed: 0,
  keywordMatchScore: 0, tags: [], strengths: [], weaknesses: [], missingKeywords: [],
  suggestedImprovement: "", notes: "", fileName: "", originalFileName: "", extractedText: "",
  textExtractionStatus: "not_started", textExtractionError: "",
};

const allowedFileExtensions = [".pdf", ".docx"];
const maxResumeFileBytes = 5 * 1024 * 1024;
const allowedFileTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export function ResumeFormModal({ open, resume, onClose, onSubmit }: {
  open: boolean;
  resume: ResumeVersion | null;
  onClose: () => void;
  onSubmit: (payload: ResumeFormPayload, setStatus: (status: ResumeSubmitStatus) => void) => Promise<void>;
}) {
  if (!open) return null;
  return <ResumeFormContent key={resume?.id ?? "new"} resume={resume} onClose={onClose} onSubmit={onSubmit} />;
}

function ResumeFormContent({ resume, onClose, onSubmit }: {
  resume: ResumeVersion | null;
  onClose: () => void;
  onSubmit: (payload: ResumeFormPayload, setStatus: (status: ResumeSubmitStatus) => void) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ResumeFormPayload>(() => resume ? payloadFromResume(resume) : emptyForm);
  const [lists, setLists] = useState(() => ({
    tags: resume?.tags.join(", ") ?? "",
    strengths: resume?.strengths.join(", ") ?? "",
    weaknesses: resume?.weaknesses.join(", ") ?? "",
    missingKeywords: resume?.missingKeywords.join(", ") ?? "",
  }));
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitStatus, setSubmitStatus] = useState<ResumeSubmitStatus>("idle");

  function update<K extends keyof ResumeFormPayload>(key: K, value: ResumeFormPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (file.size <= 0) {
      setFileError("Choose a non-empty resume file.");
      return;
    }
    if (file.size > maxResumeFileBytes) {
      setFileError("Resume files must be 5 MB or smaller.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    const validExtension = allowedFileExtensions.some((extension) => lowerName.endsWith(extension));
    const validType = !file.type || allowedFileTypes.has(file.type);
    if (!validExtension || !validType) {
      setFileError("Choose a PDF or DOCX file. Other file types are not supported.");
      return;
    }

    update("fileName", file.name);
    update("originalFileName", file.name);
    setSelectedFile(file);
    setFileError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function submit() {
    if (!form.name.trim() || !form.targetRole.trim()) {
      setError("Resume name and target role are required.");
      return;
    }
    setError("");
    setSubmitStatus(resume ? "saving" : "creating");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(), targetRole: form.targetRole.trim(), description: form.description.trim(),
        fileName: form.fileName.trim(), originalFileName: form.originalFileName.trim() || form.fileName.trim(),
        extractedText: form.extractedText.trim(), textExtractionStatus: form.extractedText.trim() ? "manual" : form.textExtractionStatus,
        textExtractionError: form.textExtractionError.trim(), suggestedImprovement: form.suggestedImprovement.trim(), notes: form.notes.trim(),
        keywordMatchScore: Math.min(100, Math.max(0, form.keywordMatchScore)),
        applicationsUsed: Math.max(0, form.applicationsUsed),
        tags: parseResumeList(lists.tags), strengths: parseResumeList(lists.strengths),
        weaknesses: parseResumeList(lists.weaknesses), missingKeywords: parseResumeList(lists.missingKeywords),
        uploadFile: selectedFile ?? undefined,
      }, setSubmitStatus);
    } catch (cause) {
      setSubmitStatus("idle");
      setError(cause instanceof Error ? cause.message : "Unable to save this resume.");
    }
  }

  const submitting = submitStatus !== "idle";
  const submitLabel = submitButtonLabel(resume, submitStatus);

  return (
    <ModalShell
      className="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={submitting} onClick={onClose} variant="ghost">Cancel</Button>
          <Button disabled={submitting} onClick={() => void submit()} variant="primary">{submitLabel}</Button>
        </div>
      }
      header={
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-white" id="resume-form-title">{resume ? "Edit resume" : "Add resume version"}</h2><p className="mt-1 text-sm text-slate-500">{resume ? "Update targeting notes, extracted text, and analysis context." : dataMode === "api" ? "Upload a PDF or DOCX. OfferOS will extract the text for analysis." : "Attach a resume filename and paste resume text manually for local analysis."}</p></div>
          <button aria-label="Close resume form" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" disabled={submitting} onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
      }
      labelledBy="resume-form-title"
    >
      {error ? <div className="mb-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {submitting ? <div className="mb-4 rounded-xl border border-indigo-300/20 bg-indigo-300/[0.08] px-4 py-3 text-sm text-indigo-100">{submitStatusMessage(submitStatus)}</div> : null}
      <div className="mb-5">
            <button
              aria-describedby={fileError ? "resume-file-error" : "resume-file-help"}
              aria-label="Choose or drop a resume file"
              className={cn(
                "flex w-full flex-col items-center rounded-xl border border-dashed px-5 py-5 text-center transition focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
                dragActive
                  ? "border-indigo-300/55 bg-indigo-400/10"
                  : "border-indigo-400/25 bg-indigo-400/[0.04] hover:border-indigo-400/40 hover:bg-indigo-400/[0.07]",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              type="button"
            >
              {form.fileName ? <FileCheck2 className="size-6 text-emerald-300" /> : <FileUp className="size-6 text-indigo-200" />}
              <span className="mt-2 text-sm font-medium text-white">{form.fileName ? form.fileName : "Choose a PDF or DOCX"}</span>
              <span className="mt-1 max-w-2xl text-xs leading-5 text-slate-500" id="resume-file-help">
                {selectedFile ? `${formatFileSize(selectedFile.size)} - ${dataMode === "api" ? "supported file ready to upload and extract" : "filename ready to save locally"}.` : dataMode === "api" ? "Upload a PDF or DOCX. OfferOS will extract the text for analysis." : "Local mode stores the filename only. Paste resume text below for analysis."}
              </span>
            </button>
            <input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label="Resume file"
              className="sr-only"
              onChange={handleFileChange}
              ref={fileInputRef}
              tabIndex={-1}
              type="file"
            />
            {fileError ? <p className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-200" id="resume-file-error" role="alert">{fileError}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
            <Field label="Resume name" required><Input data-autofocus value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
            <Field label="Target role" required><Input value={form.targetRole} onChange={(event) => update("targetRole", event.target.value)} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(value) => update("status", value as ResumeVersion["status"])} /></Field>
            <Field label="File name"><Input placeholder="resume-backend.pdf" value={form.fileName} onChange={(event) => update("fileName", event.target.value)} /></Field>
            <Field label="Keyword match score"><Input min={0} max={100} type="number" value={form.keywordMatchScore} onChange={(event) => update("keywordMatchScore", Number(event.target.value))} /></Field>
            <Field label="Applications used"><Input min={0} type="number" value={form.applicationsUsed} onChange={(event) => update("applicationsUsed", Number(event.target.value))} /></Field>
            <Field className="md:col-span-2" label="Description"><Textarea value={form.description} onChange={(value) => update("description", value)} /></Field>
            <Field className="md:col-span-2" label="Resume text"><Textarea minHeight="min-h-40" value={form.extractedText} onChange={(value) => update("extractedText", value)} placeholder="Paste resume text manually if you do not upload a file or extraction fails." /></Field>
            <ListField label="Tags" value={lists.tags} onChange={(value) => setLists((current) => ({ ...current, tags: value }))} placeholder="backend, TypeScript, APIs" />
            <ListField label="Strengths" value={lists.strengths} onChange={(value) => setLists((current) => ({ ...current, strengths: value }))} placeholder="API design, reliability" />
            <ListField label="Weaknesses" value={lists.weaknesses} onChange={(value) => setLists((current) => ({ ...current, weaknesses: value }))} placeholder="few metrics, long summary" />
            <ListField label="Missing keywords" value={lists.missingKeywords} onChange={(value) => setLists((current) => ({ ...current, missingKeywords: value }))} placeholder="Kafka, testing" />
            <Field className="md:col-span-2" label="Suggested next improvement"><Textarea value={form.suggestedImprovement} onChange={(value) => update("suggestedImprovement", value)} /></Field>
            <Field className="md:col-span-2" label="Notes"><Textarea value={form.notes} onChange={(value) => update("notes", value)} /></Field>
      </div>
    </ModalShell>
  );
}

function payloadFromResume(resume: ResumeVersion): ResumeFormPayload {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, lastUpdated: _lastUpdated, ...payload } = resume;
  return payload;
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={className}><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}{required ? <span className="text-cyan-300"> *</span> : null}</span>{children}</label>;
}

function ListField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <Field label={label}><Input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function Textarea({ value, onChange, placeholder, minHeight = "min-h-24" }: { value: string; onChange: (value: string) => void; placeholder?: string; minHeight?: string }) {
  return <textarea className={`${minHeight} w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function Select({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)}><option>Active</option><option>Draft</option></select>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function submitButtonLabel(resume: ResumeVersion | null, status: ResumeSubmitStatus) {
  if (status === "creating") return "Creating resume...";
  if (status === "saving") return "Saving changes...";
  if (status === "uploading") return "Uploading file...";
  if (status === "extracting") return "Extracting text...";
  if (status === "ready") return "Resume ready for analysis";
  return resume ? "Save changes" : "Create resume";
}

function submitStatusMessage(status: ResumeSubmitStatus) {
  if (status === "creating") return "Creating resume...";
  if (status === "saving") return "Saving resume...";
  if (status === "uploading") return "Uploading file...";
  if (status === "extracting") return "Extracting text...";
  if (status === "ready") return "Resume ready for analysis.";
  return "";
}
