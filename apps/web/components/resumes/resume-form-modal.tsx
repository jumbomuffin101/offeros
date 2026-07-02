"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { FileCheck2, FileUp, X } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { parseResumeList } from "@/lib/resume-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModalBehavior } from "@/hooks/use-modal-behavior";
import { cn } from "@/lib/utils";

export type ResumeFormPayload = Omit<ResumeVersion, "id" | "createdAt" | "updatedAt" | "lastUpdated">;

const emptyForm: ResumeFormPayload = {
  name: "", targetRole: "", description: "", status: "Draft", applicationsUsed: 0,
  keywordMatchScore: 0, tags: [], strengths: [], weaknesses: [], missingKeywords: [],
  suggestedImprovement: "", notes: "", fileName: "",
};

const allowedFileExtensions = [".pdf", ".doc", ".docx"];
const allowedFileTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export function ResumeFormModal({ open, resume, onClose, onSubmit }: {
  open: boolean;
  resume: ResumeVersion | null;
  onClose: () => void;
  onSubmit: (payload: ResumeFormPayload) => void;
}) {
  if (!open) return null;
  return <ResumeFormContent key={resume?.id ?? "new"} resume={resume} onClose={onClose} onSubmit={onSubmit} />;
}

function ResumeFormContent({ resume, onClose, onSubmit }: {
  resume: ResumeVersion | null;
  onClose: () => void;
  onSubmit: (payload: ResumeFormPayload) => void;
}) {
  const dialogRef = useModalBehavior();
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

  function update<K extends keyof ResumeFormPayload>(key: K, value: ResumeFormPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectFile(file: File | undefined) {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const validExtension = allowedFileExtensions.some((extension) => lowerName.endsWith(extension));
    const validType = !file.type || allowedFileTypes.has(file.type);
    if (!validExtension || !validType) {
      setFileError("Choose a PDF, DOC, or DOCX file. Other file types are not supported.");
      return;
    }

    update("fileName", file.name);
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

  function submit() {
    if (!form.name.trim() || !form.targetRole.trim()) {
      setError("Resume name and target role are required.");
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(), targetRole: form.targetRole.trim(), description: form.description.trim(),
      fileName: form.fileName.trim(), suggestedImprovement: form.suggestedImprovement.trim(), notes: form.notes.trim(),
      keywordMatchScore: Math.min(100, Math.max(0, form.keywordMatchScore)),
      applicationsUsed: Math.max(0, form.applicationsUsed),
      tags: parseResumeList(lists.tags), strengths: parseResumeList(lists.strengths),
      weaknesses: parseResumeList(lists.weaknesses), missingKeywords: parseResumeList(lists.missingKeywords),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/75 p-2 backdrop-blur-xl sm:p-4">
      <div className="glass-card page-enter flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl sm:max-h-[90dvh]" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="resume-form-title">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div><h2 className="text-xl font-semibold text-white" id="resume-form-title">{resume ? "Edit resume" : "Add resume version"}</h2><p className="mt-1 text-sm text-slate-500">Store targeting notes and the local file reference.</p></div>
          <button aria-label="Close resume form" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-5 pb-8 sm:px-6">
          {error ? <div className="mb-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
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
              <span className="mt-2 text-sm font-medium text-white">{form.fileName ? form.fileName : "Choose a PDF, DOC, or DOCX"}</span>
              <span className="mt-1 text-xs text-slate-500" id="resume-file-help">Click to browse or drop a file here. Only the file name is stored locally.</span>
            </button>
            <input
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            <ListField label="Tags" value={lists.tags} onChange={(value) => setLists((current) => ({ ...current, tags: value }))} placeholder="backend, TypeScript, APIs" />
            <ListField label="Strengths" value={lists.strengths} onChange={(value) => setLists((current) => ({ ...current, strengths: value }))} placeholder="API design, reliability" />
            <ListField label="Weaknesses" value={lists.weaknesses} onChange={(value) => setLists((current) => ({ ...current, weaknesses: value }))} placeholder="few metrics, long summary" />
            <ListField label="Missing keywords" value={lists.missingKeywords} onChange={(value) => setLists((current) => ({ ...current, missingKeywords: value }))} placeholder="Kafka, testing" />
            <Field className="md:col-span-2" label="Suggested next improvement"><Textarea value={form.suggestedImprovement} onChange={(value) => update("suggestedImprovement", value)} /></Field>
            <Field className="md:col-span-2" label="Notes"><Textarea value={form.notes} onChange={(value) => update("notes", value)} /></Field>
          </div>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[#1b1d2b]/95 px-4 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6 sm:py-5"><Button onClick={onClose} variant="ghost">Cancel</Button><Button onClick={submit} variant="primary">{resume ? "Save changes" : "Create resume"}</Button></div>
      </div>
    </div>
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

function Textarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <textarea className="min-h-24 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15" value={value} onChange={(event) => onChange(event.target.value)} />;
}

function Select({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)}><option>Active</option><option>Draft</option></select>;
}
