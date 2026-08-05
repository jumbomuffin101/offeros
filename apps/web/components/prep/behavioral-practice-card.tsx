"use client";

import { useEffect, useState } from "react";
import { Brain, CheckCircle2, Pencil, Target } from "lucide-react";
import type { BehavioralPortfolio, BehavioralQuestion, PrepStatus } from "@/lib/types";
import { competencyLabel } from "@/lib/behavioral-coach";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export function BehavioralPracticeCard({ questions, onEdit, onStatus, loadPortfolio }: {
  questions: BehavioralQuestion[];
  onEdit: (question: BehavioralQuestion) => void;
  onStatus: (question: BehavioralQuestion, status: PrepStatus) => void;
  loadPortfolio: () => Promise<BehavioralPortfolio>;
}) {
  const [portfolio, setPortfolio] = useState<BehavioralPortfolio | null>(null);
  useEffect(() => { let active = true; void loadPortfolio().then((value) => { if (active) setPortfolio(value); }).catch(() => undefined); return () => { active = false; }; }, [loadPortfolio, questions]);
  return <Card className="premium-hover"><CardHeader><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-xl border border-violet-300/20 bg-violet-300/10 p-2.5 text-violet-200"><Brain className="size-5" /></span><div><h2 className="text-lg font-semibold text-white">Behavioral Coach</h2><p className="text-sm text-slate-500">Build a reusable STAR story portfolio and practice the competencies that need attention.</p></div></div>{portfolio ? <div className="text-right text-xs text-slate-400"><p><span className="font-semibold text-white">{portfolio.interviewReadyStories}</span> interview-ready</p><p>{portfolio.competenciesCovered.length} of 16 competencies covered</p></div> : null}</div></CardHeader><CardContent>
    {portfolio ? <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Portfolio coverage</p><p className="mt-1 text-sm text-slate-300">{portfolio.topNextAction}</p></div><Target className="size-5 text-indigo-300" /></div><Progress className="mt-3" value={(portfolio.competenciesCovered.length / 16) * 100} tone="purple" />{portfolio.missingCompetencies.length ? <div className="mt-3 flex flex-wrap gap-1.5">{portfolio.missingCompetencies.slice(0, 5).map((item) => <Badge key={item} tone="slate">Missing: {competencyLabel(item)}</Badge>)}</div> : null}</div> : null}
    {!questions.length ? <div className="py-10 text-center"><Brain className="mx-auto size-6 text-violet-300" /><p className="mt-3 text-sm font-medium text-white">No behavioral stories yet</p><p className="mt-1 text-sm text-slate-500">Save a STAR answer to start building competency coverage.</p></div> : <div className="space-y-3">{questions.map((question) => {
      const sections = [question.starSituation, question.starTask, question.starAction, question.starResult]; const complete = sections.filter((section) => section.trim()).length;
      const scoreValues = question.latestEvaluation ? Object.values(question.latestEvaluation.qualityScores) : []; const latestScore = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length * 20) : null;
      return <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4" key={question.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><button className="text-left" onClick={() => onEdit(question)} type="button"><div className="flex flex-wrap items-center gap-2"><Badge tone="purple">{question.category}</Badge><Badge tone={question.readinessStatus === "interview_ready" ? "green" : "slate"}>{competencyLabel(question.readinessStatus ?? "draft")}</Badge></div><p className="mt-2 font-medium leading-6 text-white">{question.question}</p><div className="mt-2 flex flex-wrap gap-1.5">{(question.competencyTags ?? []).slice(0, 4).map((item) => <span className="rounded-md bg-indigo-400/10 px-2 py-1 text-xs text-indigo-200" key={item}>{competencyLabel(item)}</span>)}</div></button><PrepStatusSelect label="Behavioral question status" value={question.status} onChange={(status) => onStatus(question, status)} /></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="STAR complete" value={`${complete}/4`} /><Metric label="Latest score" value={latestScore === null ? "Not evaluated" : `${latestScore}%`} /><Metric label="Confidence" value={`${question.confidenceScore}/5`} /><Metric label="Trend" value={question.trendSummary?.improvedAreas.length ? "Improving" : question.latestEvaluatedAt ? "Baseline" : "No history"} /></div><Button className="mt-4" onClick={() => onEdit(question)} variant="ghost"><Pencil className="size-4" />Open story</Button></div>;
    })}</div>}
  </CardContent></Card>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-200">{value === "Improving" ? <CheckCircle2 className="size-3.5 text-emerald-300" /> : null}{value}</p></div>; }
