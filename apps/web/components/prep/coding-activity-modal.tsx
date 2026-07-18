"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { PrepModalShell } from "@/components/prep/prep-modal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityInput, CodingActivity } from "@/hooks/use-coding-intelligence";

const today = () => new Date().toISOString().slice(0, 10);

export function CodingActivityModal({ activity, onClose, onSave }: { activity: CodingActivity | null; onClose: () => void; onSave: (payload: ActivityInput) => Promise<void> }) {
  const [form, setForm] = useState<ActivityInput>(() => activity ? toInput(activity) : { problemTitle: "", problemUrl: "", difficulty: "medium", topics: [], status: "solved", solvedAt: today(), attemptedAt: "", timeSpentMinutes: 0, notes: "" });
  const [topics, setTopics] = useState(activity?.topics.join(", ") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const normalizedTopics = topics.split(",").map((topic) => topic.trim()).filter(Boolean);
    if (!form.problemTitle.trim()) { setError("Problem title is required."); return; }
    if (!form.solvedAt) { setError("Choose the date you practiced this problem."); return; }
    if (form.timeSpentMinutes < 0) { setError("Time spent cannot be negative."); return; }
    setSaving(true); setError("");
    try { await onSave({ ...form, problemTitle: form.problemTitle.trim(), topics: normalizedTopics }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save coding activity."); }
    finally { setSaving(false); }
  }

  return <PrepModalShell description="Record real coding practice. This history powers your goal, streak, and topic coverage." onClose={onClose} onSave={() => void save()} saveDisabled={saving} saveLabel={saving ? "Saving..." : activity ? "Save changes" : "Log problem"} title={activity ? "Edit coding activity" : "Log coding problem"}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Problem title"><Input autoFocus onChange={(event) => setForm({ ...form, problemTitle: event.target.value })} value={form.problemTitle} /></Field>
      <Field className="sm:col-span-2" label="Problem URL"><Input onChange={(event) => setForm({ ...form, problemUrl: event.target.value })} placeholder="https://leetcode.com/problems/..." value={form.problemUrl} /></Field>
      <Field label="Difficulty"><Select onChange={(value) => setForm({ ...form, difficulty: value as ActivityInput["difficulty"] })} options={["easy", "medium", "hard"]} value={form.difficulty} /></Field>
      <Field label="Status"><Select onChange={(value) => setForm({ ...form, status: value as ActivityInput["status"] })} options={["solved", "attempted", "review"]} value={form.status} /></Field>
      <Field className="sm:col-span-2" label="Topics"><Input onChange={(event) => setTopics(event.target.value)} placeholder="Arrays, Hash Maps, Two Pointers" value={topics} /></Field>
      <Field label="Date"><Input onChange={(event) => setForm({ ...form, solvedAt: event.target.value })} required type="date" value={form.solvedAt} /></Field>
      <Field label="Time spent (minutes)"><Input min="0" onChange={(event) => setForm({ ...form, timeSpentMinutes: Number(event.target.value) || 0 })} type="number" value={form.timeSpentMinutes} /></Field>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-slate-500">Notes</span><textarea className="min-h-24 w-full rounded-lg border border-slate-600/45 bg-slate-900/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/55 focus:ring-2 focus:ring-indigo-400/15" onChange={(event) => setForm({ ...form, notes: event.target.value })} value={form.notes} /></label>
    </div>
    {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-200" role="alert">{error}</p> : null}
    {saving ? <div className="sr-only"><Loader2 />Saving activity</div> : null}
  </PrepModalShell>;
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={className}><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>{children}</label>; }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select className="h-10 w-full rounded-lg border border-slate-600/45 bg-slate-900/55 px-3 text-sm text-slate-100 outline-none focus:border-indigo-400/55 focus:ring-2 focus:ring-indigo-400/15" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option className="capitalize" key={option} value={option}>{option}</option>)}</select>; }
function toInput(activity: CodingActivity): ActivityInput { return { problemTitle: activity.problemTitle, problemUrl: activity.problemUrl, difficulty: activity.difficulty, topics: activity.topics, status: activity.status, solvedAt: (activity.solvedAt || activity.attemptedAt).slice(0, 10), attemptedAt: "", timeSpentMinutes: activity.timeSpentMinutes, notes: activity.notes }; }
