"use client";

import { BriefcaseBusiness, CalendarClock, Code2, FileText, Flame, Handshake, MessageSquareMore, Target } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DeadlineList } from "@/components/dashboard/deadline-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MomentumCard } from "@/components/dashboard/momentum-card";
import { PipelineSummary } from "@/components/dashboard/pipeline-summary";
import { RecruitingPlan } from "@/components/dashboard/recruiting-plan";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentlyViewedCard } from "@/components/dashboard/recently-viewed-card";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { DataErrorState } from "@/components/ui/data-error-state";

export function DashboardContent() {
  const { summary, loading, error, refresh } = useDashboard();

  if (error) return <DataErrorState error={error} onRetry={() => void refresh()} />;
  if (loading || !summary) return <WorkspaceSkeleton cards={8} />;

  const { applications, resumes, prep, counts, plan, momentum, prepValues, applicationValues, deadlines, activities } = summary;

  if (summary.empty) return <div className="space-y-6"><section className="rounded-2xl border border-slate-700/40 bg-[#1b1d2b] px-6 py-14 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-200"><Target className="size-6" /></div><h2 className="mt-5 text-2xl font-semibold text-white">Build your technical recruiting workspace.</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Start with one SWE application, one targeted resume, or one interview prep task. OfferOS turns those actions into a focused daily plan.</p><div className="mx-auto mt-6 max-w-3xl"><QuickActions compact /></div></section><RecentlyViewedCard /></div>;

  return <div className="space-y-6">
    <div className="flex justify-end"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">Local workspace synced</span></div>
    <QuickActions />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total Applications" value={String(applications.length)} helper="All locally tracked opportunities" trend={`${momentum.applicationsThisWeek} added this week`} sparkline={applicationValues} icon={<BriefcaseBusiness className="size-5" />} />
      <KpiCard label="Active Interviews" value={String(counts.Interview + counts["Final Round"])} helper="Interview and final-round loops" trend={counts["Final Round"] ? `${counts["Final Round"]} in final rounds` : "No final rounds yet"} sparkline={[18, 24, 34, 42, 54, 62, Math.max(20, (counts.Interview + counts["Final Round"]) * 28)]} tone="purple" icon={<MessageSquareMore className="size-5" />} />
      <KpiCard label="OAs Pending" value={String(counts.OA)} helper="Assessments needing attention" trend={counts.OA ? "Prioritize timed coding prep" : "Assessment queue clear"} sparkline={[28, 38, 32, 54, 48, 62, Math.max(18, counts.OA * 32)]} tone="amber" icon={<Code2 className="size-5" />} />
      <KpiCard label="Offers" value={String(counts.Offer)} helper="Current successful outcomes" trend={counts.Offer ? `${counts.Offer} decision window${counts.Offer === 1 ? "" : "s"}` : "Keep the pipeline moving"} sparkline={[12, 18, 18, 26, 34, 48, Math.max(18, counts.Offer * 52)]} tone="green" icon={<Handshake className="size-5" />} />
      <KpiCard label="Response Rate" value={`${summary.responseRate}%`} helper="Responses across submitted roles" trend="OAs through closed outcomes" sparkline={[22, 28, 34, 42, 38, 46, Math.max(18, summary.responseRate)]} icon={<CalendarClock className="size-5" />} />
      <KpiCard label="Prep Streak" value={String(summary.prepStreak)} helper="Consecutive active prep days" trend={`${momentum.prepThisWeek} sessions this week`} sparkline={prepValues} tone="green" icon={<Flame className="size-5" />} />
      <KpiCard label="Resume Versions" value={String(resumes.length)} helper={`${resumes.filter((resume) => resume.status === "Active").length} active versions`} trend={resumes.length ? "Targeted library ready" : "Upload a resume to begin"} sparkline={resumes.map((resume) => resume.keywordMatchScore).slice(0, 7)} tone="purple" icon={<FileText className="size-5" />} />
      <KpiCard label="Weekly Prep" value={`${summary.weeklyPrepCompletion}%`} helper="Coding, behavioral, and design goals" trend="Progress against weekly targets" sparkline={prepValues} tone="amber" icon={<Target className="size-5" />} />
    </div>
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><RecruitingPlan items={plan} /><PipelineSummary counts={counts} nextMove={plan[0]?.label ?? "Add an application to build your pipeline."} /></div>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><MomentumCard momentum={momentum} days={prep.weeklyDays} /><DeadlineList deadlines={deadlines} /></div>
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><ActivityFeed activities={activities} /><RecentlyViewedCard /></div>
  </div>;
}
