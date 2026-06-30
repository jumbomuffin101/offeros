import { Check, Clock3, Code2, ExternalLink, Pencil, Play, Plus } from "lucide-react";
import type { CodingProblem, PrepStatus } from "@/lib/types";
import { completionPercent } from "@/lib/prep-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export function DailyCodingCard({ problems, onAdd, onEdit, onStatus }: {
  problems: CodingProblem[];
  onAdd: () => void;
  onEdit: (problem: CodingProblem) => void;
  onStatus: (problem: CodingProblem, status: PrepStatus) => void;
}) {
  const daily = problems.find((problem) => problem.status !== "Completed" && problem.status !== "Skipped") ?? problems[0];
  const completed = problems.filter((problem) => problem.status === "Completed").length;

  return (
    <Card className="premium-hover">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200"><Code2 className="size-5" /></span><div><h2 className="text-lg font-semibold text-white">Daily coding</h2><p className="text-sm text-slate-500">One focused rep for interview speed.</p></div></div>
        <Button className="px-3" onClick={onAdd} variant="ghost"><Plus className="size-4" />Add</Button>
      </CardHeader>
      <CardContent>
        {daily ? <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><div className="mb-3 flex flex-wrap gap-2"><Badge tone={daily.difficulty === "Hard" ? "red" : daily.difficulty === "Medium" ? "amber" : "green"}>{daily.difficulty}</Badge><Badge tone="cyan">{daily.topic}</Badge><Badge><Clock3 className="mr-1 size-3" />{daily.targetTimeMinutes} min</Badge></div><h3 className="text-2xl font-semibold text-white">{daily.title}</h3>{daily.notes ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{daily.notes}</p> : null}</div>
            <div className="flex shrink-0 flex-wrap gap-2"><PrepStatusSelect label={`${daily.title} status`} value={daily.status} onChange={(status) => onStatus(daily, status)} /><Button aria-label={`Edit ${daily.title}`} className="px-3" onClick={() => onEdit(daily)} title={`Edit ${daily.title}`} variant="ghost"><Pencil className="size-4" /></Button></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {daily.status !== "Completed" ? <Button onClick={() => onStatus(daily, "Completed")} variant="primary"><Check className="size-4" />Mark completed</Button> : <Button onClick={() => onStatus(daily, "In Progress")} variant="secondary"><Play className="size-4" />Practice again</Button>}
            {daily.link ? <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href={daily.link} rel="noreferrer" target="_blank">Open problem<ExternalLink className="size-4" /></a> : null}
          </div>
        </> : <div className="py-10 text-center"><Code2 className="mx-auto size-7 text-slate-600" /><h3 className="mt-3 font-semibold text-white">No coding problems yet</h3><Button className="mt-4" onClick={onAdd} variant="primary">Add problem</Button></div>}
        <div className="mt-6 border-t border-white/10 pt-5"><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">Problem queue completion</span><span className="font-semibold text-white">{completed}/{problems.length}</span></div><Progress value={completionPercent(completed, problems.length)} /></div>
        {problems.length > 1 ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{problems.filter((problem) => problem.id !== daily?.id).slice(0, 4).map((problem) => <button className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:bg-white/5" key={problem.id} onClick={() => onEdit(problem)} type="button"><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-200">{problem.title}</span><span className="text-xs text-slate-500">{problem.topic}</span></span><Badge tone={problem.status === "Completed" ? "green" : "slate"}>{problem.status}</Badge></button>)}</div> : null}
      </CardContent>
    </Card>
  );
}
