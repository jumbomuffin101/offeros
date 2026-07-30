"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  FileSearch,
  Target,
  Activity,
} from "lucide-react";
import { useToday } from "@/hooks/use-launch";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { DataErrorState } from "@/components/ui/data-error-state";
import { Progress } from "@/components/ui/progress";

export function DashboardContent() {
  const { summary, loading, error, refresh } = useToday();

  if (error && !summary) return <DataErrorState error={error} onRetry={() => void refresh()} />;
  if (loading || !summary) return <TodayLoadingState />;

  const attentionItems = summary.topAction
    ? summary.attentionItems.filter((item) => item.category !== summary.topAction?.type).slice(0, 5)
    : summary.attentionItems;

  return (
    <div className="space-y-6">
      {summary.workspaceStatus === "partial" ? (
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">
          Your core workspace is ready. One optional integration is temporarily unavailable.
        </div>
      ) : null}
      {summary.topAction ? (
        <section className="overflow-hidden rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.06] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase text-indigo-200/75">Recommended next action</div>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{summary.topAction.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{summary.topAction.description}</p>
            </div>
            <Link className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400" href={summary.topAction.actionUrl}>
              {summary.topAction.actionLabel}<ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {attentionItems.length ? <NeedsAttention items={attentionItems} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <UpcomingEvents events={summary.upcomingEvents} />
          <WeeklyProgress progress={summary.weeklyProgress} />
          <ActivityFeed activities={summary.recentActivity} />
        </div>
        <div className="space-y-6">
          <CareerHealthSummary summary={summary} />
          <PipelineSnapshot pipeline={summary.pipeline} />
          <ResumePerformance value={summary.resumePerformance} />
        </div>
      </div>
    </div>
  );
}

function CareerHealthSummary({ summary }: { summary: NonNullable<ReturnType<typeof useToday>["summary"]> }) {
  const health = summary.careerHealth;
  if (!health) {
    return <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-5"><h2 className="font-semibold text-white">Career health</h2><p className="mt-2 text-sm text-slate-400">Career Intelligence is temporarily unavailable. Your core workspace remains ready.</p></section>;
  }
  if (health.status === "insufficient_data") {
    return <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5"><div className="flex items-center gap-2"><Activity className="size-4 text-indigo-300" /><h2 className="font-semibold text-white">Career health</h2></div><p className="mt-3 text-sm text-slate-400">Add applications, analyze a resume, or complete prep to establish a useful baseline.</p><div className="mt-3 text-xs text-slate-500">Insufficient data - no score assigned</div></section>;
  }
  return <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity className="size-4 text-indigo-300" /><h2 className="font-semibold text-white">Career health</h2></div><span className="text-2xl font-semibold text-white">{health.overallScore}</span></div><Progress className="mt-4" value={health.overallScore ?? 0} /><p className="mt-3 text-xs leading-5 text-slate-500">Organizational guidance based on your OfferOS activity, not a hiring prediction.</p>{summary.riskSignal ? <p className="mt-3 text-sm text-amber-200">{summary.riskSignal}</p> : summary.improvementSignal ? <p className="mt-3 text-sm text-emerald-200">A recent activity trend is improving.</p> : null}</section>;
}

function WeeklyProgress({ progress }: { progress: NonNullable<ReturnType<typeof useToday>["summary"]>["weeklyProgress"] }) {
  const rows = [
    ["Applications", progress.applicationsAdded, progress.goals.applications ?? 5],
    ["Coding", progress.codingProblems, progress.goals.coding ?? 5],
    ["Mock interviews", progress.mockInterviews, progress.goals.mock_interviews ?? 2],
    ["Follow-ups", progress.followUpsCompleted, progress.goals.follow_ups ?? 3],
  ] as const;
  return <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5"><div><h2 className="font-semibold text-white">Weekly progress</h2><p className="mt-1 text-xs text-slate-500">Progress against your current recruiting goals.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{rows.map(([label, value, goal]) => <div key={label}><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-300">{label}</span><span className="text-slate-500">{value} / {goal}</span></div><Progress value={goal ? Math.min(100, Math.round(value / goal * 100)) : 100} /></div>)}</div></section>;
}

function PipelineSnapshot({ pipeline }: { pipeline: Record<string, number> }) {
  const stages = [["Saved", "saved"], ["Applied", "applied"], ["OA", "oa"], ["Interview", "interview"], ["Offer", "offer"]] as const;
  const max = Math.max(1, ...stages.map(([, key]) => pipeline[key] ?? 0));
  return <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5"><div className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-indigo-300" /><h2 className="font-semibold text-white">Pipeline snapshot</h2></div><p className="mt-1 text-xs text-slate-500">Active recruiting stages at a glance.</p><div className="mt-5 space-y-3">{stages.map(([label, key]) => <Link className="group block" href={`/applications?stage=${key}`} key={key}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-400 group-hover:text-slate-200">{label}</span><span className="font-medium text-white">{pipeline[key] ?? 0}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-indigo-400/75" style={{ width: `${Math.max((pipeline[key] ?? 0) ? 8 : 0, ((pipeline[key] ?? 0) / max) * 100)}%` }} /></div></Link>)}</div></section>;
}

function ResumePerformance({ value }: { value: NonNullable<ReturnType<typeof useToday>["summary"]>["resumePerformance"] }) {
  return <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5"><div className="flex items-center gap-2"><FileSearch className="size-4 text-indigo-300" /><h2 className="font-semibold text-white">Resume performance</h2></div>{value.analyzed ? <div className="mt-5"><div className="text-3xl font-semibold text-white">{value.bestScore ?? 0}%</div><p className="mt-1 text-sm text-slate-400">Best overall fit{value.bestResume ? ` - ${value.bestResume}` : ""}</p><p className="mt-4 text-xs text-slate-500">{value.analyzed} of {value.total} resume versions analyzed. Scores are heuristic AI guidance.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-200" href="/resumes">Review resumes<ArrowRight className="size-4" /></Link></div> : <div className="mt-5 rounded-lg border border-dashed border-slate-700/45 px-4 py-7 text-center"><Target className="mx-auto size-5 text-indigo-300" /><p className="mt-2 text-sm font-medium text-slate-200">No analyzed resume yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Analyze a resume against a real job description to surface role-specific gaps.</p><Link className="mt-3 inline-flex text-sm font-medium text-indigo-200" href="/resumes">Open Resume Manager</Link></div>}</section>;
}

function TodayLoadingState() {
  const [showWakeMessage, setShowWakeMessage] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowWakeMessage(true), 1_200);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="space-y-6" aria-label="Loading Today"><div className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" /><p className="text-center text-xs text-slate-500">{showWakeMessage ? "Preparing your cloud workspace..." : "Loading today's priorities..."}</p><div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]"><div className="h-80 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" /><div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" /></div></div>;
}
