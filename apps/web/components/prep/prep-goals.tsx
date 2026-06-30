"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { PrepGoal, PrepSession, WeeklyPrepDay } from "@/lib/types";
import { prepGoalProgress } from "@/lib/prep-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export function PrepGoals({ goals, sessions, days, onSave }: { goals: PrepGoal[]; sessions: PrepSession[]; days: WeeklyPrepDay[]; onSave: (goals: PrepGoal[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goals);
  function beginEdit() { setDraft(goals); setEditing(true); }
  function update(id: PrepGoal["id"], key: "target" | "current", value: number) { setDraft((current) => current.map((goal) => goal.id === id ? { ...goal, [key]: Math.max(0, value) } : goal)); }
  function save() { onSave(draft); setEditing(false); }
  return <Card><CardHeader className="flex flex-row items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Weekly goals</h2><p className="mt-1 text-sm text-slate-500">Targets for a balanced recruiting week.</p></div><Button className="px-3" onClick={editing ? save : beginEdit} variant="ghost">{editing ? <Check className="size-4" /> : <Pencil className="size-4" />}{editing ? "Save" : "Edit"}</Button></CardHeader><CardContent className="space-y-5">{(editing ? draft : goals).map((goal) => { const progress = prepGoalProgress(goal, sessions, days); return <div key={goal.id}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm text-slate-400">{goal.label}</span>{editing ? <div className="flex items-center gap-2">{goal.id === "followUps" ? <Input aria-label="Application follow-ups completed" className="h-8 w-16" min={0} type="number" value={goal.current} onChange={(event) => update(goal.id, "current", Number(event.target.value))} /> : null}<span className="text-xs text-slate-600">of</span><Input aria-label={`${goal.label} weekly target`} className="h-8 w-16" min={1} type="number" value={goal.target} onChange={(event) => update(goal.id, "target", Number(event.target.value))} /></div> : <span className="text-sm font-semibold text-white">{progress}/{goal.target}</span>}</div><Progress value={goal.target ? (progress / goal.target) * 100 : 0} tone={goal.id === "coding" ? "cyan" : goal.id === "behavioral" ? "purple" : goal.id === "systemDesign" ? "green" : "amber"} /></div>; })}</CardContent></Card>;
}
