"use client";

import { useState } from "react";
import type { PrepStatus, SystemDesignPrompt } from "@/lib/types";
import { parseConcepts } from "@/lib/prep-utils";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/prep/coding-problem-modal";
import { PrepModalShell } from "@/components/prep/prep-modal-shell";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export type SystemDesignPayload = Omit<SystemDesignPrompt, "id" | "createdAt" | "updatedAt">;
const emptyPrompt: SystemDesignPayload = { title: "", prompt: "", concepts: [], status: "Not Started", notes: "" };

export function SystemDesignModal({ open, designPrompt, onClose, onSubmit }: { open: boolean; designPrompt: SystemDesignPrompt | null; onClose: () => void; onSubmit: (payload: SystemDesignPayload) => void }) {
  if (!open) return null;
  return <SystemDesignContent key={designPrompt?.id ?? "new"} designPrompt={designPrompt} onClose={onClose} onSubmit={onSubmit} />;
}

function SystemDesignContent({ designPrompt, onClose, onSubmit }: { designPrompt: SystemDesignPrompt | null; onClose: () => void; onSubmit: (payload: SystemDesignPayload) => void }) {
  const [form, setForm] = useState<SystemDesignPayload>(() => designPrompt ? { title: designPrompt.title, prompt: designPrompt.prompt, concepts: designPrompt.concepts, status: designPrompt.status, notes: designPrompt.notes } : emptyPrompt);
  const [concepts, setConcepts] = useState(() => designPrompt?.concepts.join(", ") ?? "");
  const [error, setError] = useState("");
  function update<K extends keyof SystemDesignPayload>(key: K, value: SystemDesignPayload[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit() { if (!form.title.trim() || !form.prompt.trim()) { setError("Title and prompt are required."); return; } onSubmit({ ...form, title: form.title.trim(), prompt: form.prompt.trim(), notes: form.notes.trim(), concepts: parseConcepts(concepts) }); }
  return <PrepModalShell title={designPrompt ? "Edit system design prompt" : "Add system design prompt"} description="Capture architecture prompts, core concepts, and review notes." onClose={onClose} onSave={submit} saveLabel={designPrompt ? "Save changes" : "Add prompt"}>{error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}<div className="grid gap-4 sm:grid-cols-2"><Field label="Title" required><Input data-autofocus value={form.title} onChange={(event) => update("title", event.target.value)} /></Field><div><span className="mb-1.5 block text-xs font-medium text-slate-500">Status</span><PrepStatusSelect label="System design prompt status" value={form.status} onChange={(status: PrepStatus) => update("status", status)} /></div><Field className="sm:col-span-2" label="Prompt" required><Textarea value={form.prompt} onChange={(value) => update("prompt", value)} /></Field><Field className="sm:col-span-2" label="Concepts"><Input placeholder="Caching, queues, idempotency" value={concepts} onChange={(event) => setConcepts(event.target.value)} /></Field><Field className="sm:col-span-2" label="Notes"><Textarea rows={6} value={form.notes} onChange={(value) => update("notes", value)} /></Field></div></PrepModalShell>;
}
