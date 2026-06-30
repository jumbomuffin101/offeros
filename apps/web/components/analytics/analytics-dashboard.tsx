"use client";

import { Award, CalendarRange, FileText, Flame, Target, TrendingUp } from "lucide-react";
import { useOfferOSData } from "@/hooks/use-offeros-data";
import { buildAnalytics, type CountDatum } from "@/lib/analytics-utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const toneText = { cyan: "text-cyan-300", green: "text-emerald-300", amber: "text-amber-300", red: "text-rose-300", purple: "text-violet-300" };

export function AnalyticsDashboard() {
  const { applications, resumes, prep, asOf, hydrated } = useOfferOSData();
  const analytics = buildAnalytics(applications, resumes, prep, asOf);
  const maxWeekly = Math.max(1, ...analytics.applicationsOverTime.map((item) => item.value));
  const maxStatus = Math.max(1, ...analytics.statusDistribution.map((item) => item.value));

  return <div className="space-y-6">
    <div className="flex justify-end"><span className={`rounded-full border px-2.5 py-1 text-xs ${hydrated ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-500"}`}>{hydrated ? "Calculated from local workspace" : "Loading local analytics"}</span></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{analytics.metrics.map((metric) => <Card className="premium-hover" key={metric.id}><CardContent><div className={`text-sm font-medium ${toneText[metric.tone]}`}>{metric.label}</div><div className="mt-3 text-3xl font-semibold text-white">{metric.value}</div><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{metric.helper}</p><div className="mt-4 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-300">{metric.change}</div></CardContent></Card>)}</div>

    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card><CardHeader><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Applications over time</h2><p className="mt-1 text-sm text-slate-500">Six-week application velocity from applied or created dates.</p></div><TrendingUp className="size-5 text-cyan-300" /></div></CardHeader><CardContent>{applications.length ? <div className="flex h-56 items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-5">{analytics.applicationsOverTime.map((item) => <div className="flex h-full flex-1 flex-col justify-end gap-2" key={item.label}><div className="text-center text-sm font-semibold text-white">{item.value}</div><div className="min-h-2 rounded-t-lg bg-gradient-to-t from-cyan-500 via-violet-400 to-emerald-300 transition-all" style={{ height: `${Math.max(6, (item.value / maxWeekly) * 100)}%` }} /><div className="truncate text-center text-[10px] text-slate-500">{item.label}</div></div>)}</div> : <EmptyState title="No application history" detail="Add applications to build a weekly velocity chart." />}</CardContent></Card>
      <Card><CardHeader><h2 className="text-lg font-semibold text-white">Conversion funnel</h2><p className="mt-1 text-sm text-slate-500">Progression relative to submitted applications.</p></CardHeader><CardContent className="space-y-4">{analytics.conversion.map((step) => <div key={step.label}><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">{step.label}</span><span className="font-semibold text-white">{step.value} · {step.percent}%</span></div><div className="h-8 rounded-xl border border-white/10 bg-slate-950/45 p-1"><div className="progress-fill h-full rounded-lg bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300" style={{ width: `${step.percent}%` }} /></div></div>)}<div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4"><CalendarRange className="size-5 text-amber-200" /><div><div className="text-xs text-slate-500">Average applied-to-deadline window</div><div className="mt-1 font-semibold text-white">{analytics.averageDeadlineDays === null ? "Not enough date data" : `${analytics.averageDeadlineDays} days`}</div></div></div></CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <DistributionCard title="Status distribution" data={analytics.statusDistribution} max={maxStatus} tone="cyan" />
      <DistributionCard title="Applications by source" data={analytics.sourceDistribution} max={Math.max(1, ...analytics.sourceDistribution.map((item) => item.value))} tone="purple" />
      <DistributionCard title="Applications by priority" data={analytics.priorityDistribution} max={Math.max(1, ...analytics.priorityDistribution.map((item) => item.value))} tone="amber" />
    </div>

    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Card className="premium-hover"><CardContent><FileText className="size-6 text-cyan-300" /><div className="mt-4 text-xs font-medium uppercase text-slate-500">Most used resume</div><div className="mt-2 text-xl font-semibold text-white">{analytics.mostUsedResume?.name ?? "No resume linked"}</div><p className="mt-2 text-sm text-slate-500">{analytics.mostUsedResume ? `${analytics.mostUsedResume.uses} tracked application${analytics.mostUsedResume.uses === 1 ? "" : "s"}` : "Link a resume from an application."}</p></CardContent></Card>
        <Card className="premium-hover"><CardContent><Award className="size-6 text-emerald-300" /><div className="mt-4 text-xs font-medium uppercase text-slate-500">Best keyword match</div><div className="mt-2 text-xl font-semibold text-white">{analytics.bestMatchResume?.name ?? "No resume data"}</div><p className="mt-2 text-sm text-slate-500">{analytics.bestMatchResume ? `${analytics.bestMatchResume.keywordMatchScore}% match for ${analytics.bestMatchResume.targetRole}` : "Create a resume version to compare targeting."}</p></CardContent></Card>
      </div>
      <Card><CardHeader><h2 className="text-lg font-semibold text-white">Resume performance</h2><p className="mt-1 text-sm text-slate-500">Keyword alignment across local resume versions.</p></CardHeader><CardContent className="space-y-4">{resumes.length ? [...resumes].sort((a, b) => b.keywordMatchScore - a.keywordMatchScore).map((resume) => <div key={resume.id}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="truncate text-slate-300">{resume.name}</span><span className="font-semibold text-white">{resume.keywordMatchScore}%</span></div><Progress value={resume.keywordMatchScore} tone={resume.keywordMatchScore >= 85 ? "green" : "purple"} /></div>) : <EmptyState title="No resume versions" detail="Upload a resume to see targeting and usage analytics." />}</CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card><CardHeader><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Prep completion trend</h2><p className="mt-1 text-sm text-slate-500">Completed sessions across the rolling week.</p></div><Flame className="size-5 text-amber-200" /></div></CardHeader><CardContent><div className="grid grid-cols-7 gap-2">{analytics.prepTrend.map((day) => <div className="text-center" key={day.label}><div className={`flex aspect-square items-center justify-center rounded-xl border text-sm font-semibold ${day.value ? "border-cyan-300/25 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/[0.025] text-slate-600"}`}>{day.value}</div><span className="mt-2 block text-xs text-slate-500">{day.label}</span></div>)}</div><div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-4"><span className="text-sm text-slate-400">Current prep streak</span><span className="text-lg font-semibold text-white">{analytics.prepStreak} days</span></div></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-2"><Target className="size-5 text-violet-300" /><div><h2 className="text-lg font-semibold text-white">Weekly goal progress</h2><p className="mt-1 text-sm text-slate-500">Live progress from Prep workspace completion history.</p></div></div></CardHeader><CardContent className="space-y-5">{analytics.goalProgress.map((goal) => <div key={goal.label}><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">{goal.label}</span><span className="font-semibold text-white">{goal.current}/{goal.target}</span></div><Progress value={goal.target ? (goal.current / goal.target) * 100 : 0} tone="purple" /></div>)}</CardContent></Card>
    </div>
  </div>;
}

function DistributionCard({ title, data, max, tone }: { title: string; data: CountDatum[]; max: number; tone: "cyan" | "purple" | "amber" }) {
  return <Card><CardHeader><h2 className="text-lg font-semibold text-white">{title}</h2></CardHeader><CardContent className="space-y-4">{data.some((item) => item.value) ? data.map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="truncate text-slate-400">{item.label}</span><span className="font-semibold text-white">{item.value}</span></div><Progress value={(item.value / max) * 100} tone={tone} /></div>) : <EmptyState title="No data yet" detail="This breakdown will populate from local applications." />}</CardContent></Card>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><p className="text-sm font-medium text-slate-300">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>; }
