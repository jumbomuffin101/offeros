"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Save, X } from "lucide-react";
import type { BehavioralQuestion, PrepStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/prep/coding-problem-modal";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";
import { useModalBehavior } from "@/hooks/use-modal-behavior";

export function BehavioralAnswerDrawer({ question, onClose, onSave }: { question: BehavioralQuestion | null; onClose: () => void; onSave: (question: BehavioralQuestion) => void }) {
  if (!question) return null;
  return <BehavioralDrawerContent key={question.id} question={question} onClose={onClose} onSave={onSave} />;
}

function BehavioralDrawerContent({ question, onClose, onSave }: { question: BehavioralQuestion; onClose: () => void; onSave: (question: BehavioralQuestion) => void }) {
  const dialogRef = useModalBehavior();
  const [form, setForm] = useState(question);
  function update<K extends keyof BehavioralQuestion>(key: K, value: BehavioralQuestion[K]) { setForm((current) => ({ ...current, [key]: value })); }
  return createPortal(<div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="page-enter ml-auto flex h-[100dvh] w-full max-w-2xl flex-col border-l border-white/10 bg-[#1b1d2b] shadow-2xl shadow-black/30" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit behavioral answer"><div className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5"><div><h2 className="text-xl font-semibold text-white">Behavioral answer</h2><p className="mt-1 max-w-lg text-sm leading-6 text-slate-400">{question.question}</p></div><button aria-label="Close behavioral answer" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button></div><div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 pb-8 sm:px-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><Input data-autofocus value={form.category} onChange={(event) => update("category", event.target.value)} /></Field><div><span className="mb-1.5 block text-xs font-medium text-slate-500">Status</span><PrepStatusSelect label="Behavioral answer status" value={form.status} onChange={(status: PrepStatus) => update("status", status)} /></div></div><Field label="Situation"><Textarea rows={5} value={form.starSituation} onChange={(value) => update("starSituation", value)} /></Field><Field label="Task"><Textarea rows={4} value={form.starTask} onChange={(value) => update("starTask", value)} /></Field><Field label="Action"><Textarea rows={6} value={form.starAction} onChange={(value) => update("starAction", value)} /></Field><Field label="Result"><Textarea rows={5} value={form.starResult} onChange={(value) => update("starResult", value)} /></Field><Field label={`Confidence score: ${form.confidenceScore}/5`}><input aria-label="Confidence score" className="h-2 w-full cursor-pointer accent-indigo-400" max={5} min={1} type="range" value={form.confidenceScore} onChange={(event) => update("confidenceScore", Number(event.target.value))} /></Field></div><div className="flex shrink-0 justify-end gap-2 border-t border-white/10 bg-[#1b1d2b] px-4 py-4 sm:px-6"><Button onClick={onClose} variant="ghost">Cancel</Button><Button onClick={() => onSave(form)} variant="primary"><Save className="size-4" />Save answer</Button></div></aside></div>, document.body);
}
