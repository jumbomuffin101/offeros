import { Brain, CheckCircle2, Pencil } from "lucide-react";
import type { BehavioralQuestion, PrepStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export function BehavioralPracticeCard({ questions, onEdit, onStatus }: {
  questions: BehavioralQuestion[];
  onEdit: (question: BehavioralQuestion) => void;
  onStatus: (question: BehavioralQuestion, status: PrepStatus) => void;
}) {
  const question = questions.find((item) => item.status !== "Completed" && item.status !== "Skipped") ?? questions[0];
  if (!question) return <Card><CardContent className="py-12 text-center text-sm text-slate-500">No behavioral questions available.</CardContent></Card>;
  const sections = [question.starSituation, question.starTask, question.starAction, question.starResult];
  const complete = sections.filter((section) => section.trim()).length;
  return <Card className="premium-hover"><CardHeader><div className="flex items-center gap-3"><span className="rounded-xl border border-violet-300/20 bg-violet-300/10 p-2.5 text-violet-200"><Brain className="size-5" /></span><div><h2 className="text-lg font-semibold text-white">Behavioral practice</h2><p className="text-sm text-slate-500">Turn raw stories into concise STAR answers.</p></div></div></CardHeader><CardContent>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Badge tone="purple">{question.category}</Badge><p className="mt-3 text-lg font-medium leading-7 text-white">{question.question}</p></div><PrepStatusSelect label="Behavioral question status" value={question.status} onChange={(status) => onStatus(question, status)} /></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-4">{["Situation", "Task", "Action", "Result"].map((label, index) => <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3" key={label}><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span>{sections[index] ? <CheckCircle2 className="size-3.5 text-emerald-300" /> : null}</div><p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{sections[index] || "Not drafted"}</p></div>)}</div>
    <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">Answer completeness</span><span className="font-semibold text-white">{complete}/4 · Confidence {question.confidenceScore}/5</span></div><Progress value={(complete / 4) * 100} tone="purple" /></div>
    <Button className="mt-5" onClick={() => onEdit(question)} variant="primary"><Pencil className="size-4" />Practice answer</Button>
  </CardContent></Card>;
}
