"use client";

import { ArrowLeft, RefreshCw, Save, Target } from "lucide-react";
import type { MockInterviewSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function MockInterviewScorecardView({
  session,
  onBack,
  onRetry,
  onSaveActions,
}: {
  session: MockInterviewSession;
  onBack: () => void;
  onRetry: () => void;
  onSaveActions: () => void;
}) {
  const scorecard = session.scorecard;
  if (!scorecard) return null;
  const dimensions = [
    ["Communication", scorecard.communicationScore],
    ["Technical accuracy", scorecard.technicalAccuracyScore],
    ["Structure", scorecard.structureScore],
    ["Depth", scorecard.depthScore],
    ["Relevance", scorecard.relevanceScore],
  ] as const;
  const candidateTurns = (session.turns ?? []).filter((turn) => turn.speaker === "candidate");

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-indigo-300/20 bg-indigo-300/[0.055] p-6">
        <div className="text-xs font-semibold uppercase text-indigo-200/70">AI-generated practice assessment</div>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-5xl font-semibold text-white">{session.overallScore ?? 0}</div>
            <div className="mt-1 text-sm text-slate-400">Overall practice score</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="ghost"><ArrowLeft className="size-4" />Start another type</Button>
            <Button onClick={onRetry} variant="secondary"><RefreshCw className="size-4" />Retry</Button>
            <Button onClick={onSaveActions} variant="primary"><Save className="size-4" />Save next action to Prep</Button>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">{scorecard.summary}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">AI-generated practice feedback may be incomplete or inaccurate and is not an objective hiring prediction.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {dimensions.map(([label, value]) => (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-4" key={label}>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
            <Progress className="mt-3" tone={value >= 75 ? "green" : value >= 55 ? "amber" : "red"} value={value} />
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <ListSection title="Strengths" values={scorecard.strengths} tone="emerald" />
        <ListSection title="Weaknesses" values={scorecard.weaknesses} tone="amber" />
        <ListSection title="Missed points" values={scorecard.missedPoints} tone="rose" />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5">
          <h2 className="font-semibold text-white">Compared with recent interviews</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">{trendSummary(session)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            {session.trendDelta.strongestDimension ? <span>Strongest: {formatDimension(session.trendDelta.strongestDimension)}</span> : null}
            {session.trendDelta.weakestDimension ? <span>Focus: {formatDimension(session.trendDelta.weakestDimension)}</span> : null}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5">
          <h2 className="font-semibold text-white">Career Intelligence updates</h2>
          <ul className="mt-3 space-y-2">
            {session.observationUpdates.length ? session.observationUpdates.map((item) => <li className="text-sm leading-6 text-slate-400" key={`${item.type}-${item.dimension}`}>{item.summary}</li>) : <li className="text-sm text-slate-500">No longitudinal observation changed from this session.</li>}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Career Health uses a bounded, recency-weighted contribution, so one session cannot cause a dramatic swing.</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5">
        <div className="flex items-center gap-2"><Target className="size-4 text-indigo-300" /><h2 className="font-semibold text-white">Recommended prep actions</h2></div>
        <ol className="mt-4 space-y-3">
          {scorecard.recommendedActions.map((action, index) => (
            <li className="flex gap-3 text-sm leading-6 text-slate-300" key={`${action}-${index}`}>
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-indigo-300/10 text-xs text-indigo-200">{index + 1}</span>
              {action}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5">
        <h2 className="font-semibold text-white">Question-by-question review</h2>
        <div className="mt-4 space-y-3">
          {candidateTurns.map((turn, index) => (
            <details className="rounded-lg border border-slate-700/35 bg-slate-950/20 p-4" key={turn.id}>
              <summary className="cursor-pointer text-sm font-medium text-slate-200">Answer {index + 1}: {turn.evaluation?.summary || "Practice response"}</summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{turn.content}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function ListSection({ title, values, tone }: { title: string; values: string[]; tone: "emerald" | "amber" | "rose" }) {
  const dot = tone === "emerald" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-rose-400";
  return <section className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5"><h2 className="font-semibold text-white">{title}</h2><ul className="mt-4 space-y-3">{values.length ? values.map((value) => <li className="flex gap-2 text-sm leading-6 text-slate-400" key={value}><span className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`} />{value}</li>) : <li className="text-sm text-slate-500">No items recorded.</li>}</ul></section>;
}

function trendSummary(session: MockInterviewSession) {
  const trend = session.trendDelta;
  if (trend.direction === "insufficient_data" || typeof trend.recentAverage !== "number") return "This session establishes a longitudinal practice baseline.";
  const delta = trend.delta ?? 0;
  return `${trend.direction === "improving" ? "Improving" : trend.direction === "declining" ? "Needs attention" : "Stable"}: ${Math.abs(delta)} points ${delta >= 0 ? "above" : "below"} the recent average of ${trend.recentAverage}.`;
}
function formatDimension(value: string) { return value.replaceAll("_", " "); }
