"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { CodingProblem, PrepStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export type CodingProblemPayload = Omit<CodingProblem, "id" | "completedAt" | "createdAt" | "updatedAt">;
const emptyProblem: CodingProblemPayload = { title: "", difficulty: "Medium", topic: "", targetTimeMinutes: 30, status: "Not Started", notes: "", link: "" };

export function CodingProblemModal({ open, problem, onClose, onSubmit }: { open: boolean; problem: CodingProblem | null; onClose: () => void; onSubmit: (payload: CodingProblemPayload) => void }) {
  if (!open) return null;
  return <CodingProblemContent key={problem?.id ?? "new"} problem={problem} onClose={onClose} onSubmit={onSubmit} />;
}

function CodingProblemContent({ problem, onClose, onSubmit }: { problem: CodingProblem | null; onClose: () => void; onSubmit: (payload: CodingProblemPayload) => void }) {
  const [form, setForm] = useState<CodingProblemPayload>(() => problem ? { title: problem.title, difficulty: problem.difficulty, topic: problem.topic, targetTimeMinutes: problem.targetTimeMinutes, status: problem.status, notes: problem.notes, link: problem.link } : emptyProblem);
  const [error, setError] = useState("");
  function update<K extends keyof CodingProblemPayload>(key: K, value: CodingProblemPayload[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit() { if (!form.title.trim() || !form.topic.trim()) { setError("Title and topic are required."); return; } onSubmit({ ...form, title: form.title.trim(), topic: form.topic.trim(), notes: form.notes.trim(), link: form.link.trim(), targetTimeMinutes: Math.max(5, form.targetTimeMinutes) }); }
  return <ModalShell title={problem ? "Edit coding problem" : "Add coding problem"} onClose={onClose} onSave={submit} saveLabel={problem ? "Save changes" : "Add problem"}>
    {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Problem title" required><Input value={form.title} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Topic" required><Input placeholder="Graphs, sliding window" value={form.topic} onChange={(event) => update("topic", event.target.value)} /></Field><Field label="Difficulty"><select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15" value={form.difficulty} onChange={(event) => update("difficulty", event.target.value as CodingProblem["difficulty"])}><option>Easy</option><option>Medium</option><option>Hard</option></select></Field><Field label="Target time"><Input min={5} type="number" value={form.targetTimeMinutes} onChange={(event) => update("targetTimeMinutes", Number(event.target.value))} /></Field><div><span className="mb-1.5 block text-xs font-medium text-slate-500">Status</span><PrepStatusSelect label="Coding problem status" value={form.status} onChange={(status: PrepStatus) => update("status", status)} /></div><Field label="Problem link"><Input value={form.link} onChange={(event) => update("link", event.target.value)} /></Field><Field className="sm:col-span-2" label="Notes"><Textarea value={form.notes} onChange={(value) => update("notes", value)} /></Field></div>
  </ModalShell>;
}

export function ModalShell({ title, children, onClose, onSave, saveLabel }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; saveLabel: string }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-xl"><div className="glass-card page-enter flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl" role="dialog" aria-modal="true" aria-label={title}><div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-500">Keep the practice target specific and reviewable.</p></div><button aria-label={`Close ${title}`} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button></div><div className="space-y-4 overflow-y-auto px-6 py-5">{children}</div><div className="flex flex-col-reverse gap-2 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end"><Button onClick={onClose} variant="ghost">Cancel</Button><Button onClick={onSave} variant="primary">{saveLabel}</Button></div></div></div>; }
export function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) { return <label className={className}><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}{required ? <span className="text-cyan-300"> *</span> : null}</span>{children}</label>; }
export function Textarea({ value, onChange, rows = 4 }: { value: string; onChange: (value: string) => void; rows?: number }) { return <textarea className="w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />; }
