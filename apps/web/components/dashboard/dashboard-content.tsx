"use client";

import { BriefcaseBusiness, CalendarClock, Code2, FileText, Flame, Handshake, MessageSquareMore, Target } from "lucide-react";
import { useOfferOSData } from "@/hooks/use-offeros-data";
import { applicationCounts, recruitingMomentum, recruitingPlan, recentActivity, responseRate, upcomingDeadlines, weeklyPrepCompletion } from "@/lib/dashboard-utils";
import { calculateStreak } from "@/lib/prep-utils";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DeadlineList } from "@/components/dashboard/deadline-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MomentumCard } from "@/components/dashboard/momentum-card";
import { PipelineSummary } from "@/components/dashboard/pipeline-summary";
import { RecruitingPlan } from "@/components/dashboard/recruiting-plan";

export function DashboardContent() {
  const { applications, resumes, prep, asOf, hydrated } = useOfferOSData();
  const counts = applicationCounts(applications);
  const plan = recruitingPlan(applications, resumes, prep, asOf);
  const momentum = recruitingMomentum(applications, resumes, prep, asOf);
  const prepValues = prep.weeklyDays.map((day) => Math.min(100, (day.coding + day.behavioral + day.systemDesign) * 32));
  const appValues = weeklyApplicationSparkline(applications, asOf);

  return <div className="space-y-6">
    <div className="flex justify-end"><span className={`rounded-full border px-2.5 py-1 text-xs ${hydrated ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-500"}`}>{hydrated ? "Local workspace synced" : "Loading local workspace"}</span></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total Applications" value={String(applications.length)} helper="All locally tracked opportunities" trend={`${momentum.applicationsThisWeek} added this week`} sparkline={appValues} icon={<BriefcaseBusiness className="size-5" />} />
      <KpiCard label="Active Interviews" value={String(counts.Interview + counts["Final Round"])} helper="Interview and final-round loops" trend={counts["Final Round"] ? `${counts["Final Round"]} in final rounds` : "No final rounds yet"} sparkline={[18, 24, 34, 42, 54, 62, Math.max(20, (counts.Interview + counts["Final Round"]) * 28)]} tone="purple" icon={<MessageSquareMore className="size-5" />} />
      <KpiCard label="OAs Pending" value={String(counts.OA)} helper="Assessments needing attention" trend={counts.OA ? "Prioritize timed coding prep" : "Assessment queue clear"} sparkline={[28, 38, 32, 54, 48, 62, Math.max(18, counts.OA * 32)]} tone="amber" icon={<Code2 className="size-5" />} />
      <KpiCard label="Offers" value={String(counts.Offer)} helper="Current successful outcomes" trend={counts.Offer ? `${counts.Offer} decision window${counts.Offer === 1 ? "" : "s"}` : "Keep the pipeline moving"} sparkline={[12, 18, 18, 26, 34, 48, Math.max(18, counts.Offer * 52)]} tone="green" icon={<Handshake className="size-5" />} />
      <KpiCard label="Response Rate" value={`${responseRate(applications)}%`} helper="Responses across submitted roles" trend="OAs through closed outcomes" sparkline={[22, 28, 34, 42, 38, 46, Math.max(18, responseRate(applications))]} icon={<CalendarClock className="size-5" />} />
      <KpiCard label="Prep Streak" value={String(calculateStreak(prep.weeklyDays))} helper="Consecutive active prep days" trend={`${momentum.prepThisWeek} sessions this week`} sparkline={prepValues} tone="green" icon={<Flame className="size-5" />} />
      <KpiCard label="Resume Versions" value={String(resumes.length)} helper={`${resumes.filter((resume) => resume.status === "Active").length} active versions`} trend={resumes.length ? "Targeted library ready" : "Upload a resume to begin"} sparkline={resumes.map((resume) => resume.keywordMatchScore).slice(0, 7)} tone="purple" icon={<FileText className="size-5" />} />
      <KpiCard label="Weekly Prep" value={`${weeklyPrepCompletion(prep)}%`} helper="Coding, behavioral, and design goals" trend="Progress against weekly targets" sparkline={prepValues} tone="amber" icon={<Target className="size-5" />} />
    </div>
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><RecruitingPlan items={plan} /><PipelineSummary counts={counts} nextMove={plan[0]?.label ?? "Add an application to build your pipeline."} /></div>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><MomentumCard momentum={momentum} days={prep.weeklyDays} /><DeadlineList deadlines={upcomingDeadlines(applications, asOf)} /></div>
    <ActivityFeed activities={recentActivity(applications, resumes, prep, asOf)} />
  </div>;
}

function weeklyApplicationSparkline(applications: Array<{ createdAt: string }>, asOf: string) {
  const asOfTime = new Date(asOf).getTime();
  const values = Array.from({ length: 7 }, (_, index) => applications.filter((application) => {
    const days = Math.floor((asOfTime - new Date(application.createdAt).getTime()) / 86_400_000);
    return days >= 0 && days <= 6 - index;
  }).length * 10 + 18);
  return values;
}
