import { Activity, Lightbulb, Target, TrendingUp } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { buildResumeInsights } from "@/lib/resume-insights";
import { Progress } from "@/components/ui/progress";

export function ResumeInsights({ resumes }: { resumes: ResumeVersion[] }) {
  const summary = buildResumeInsights(resumes);
  const active = resumes.filter((resume) => resume.status === "Active").length;
  const insights = [
    { label: "Best keyword match", value: summary.bestKeywordMatch ? `${summary.bestKeywordMatch.name} - ${summary.bestKeywordMatch.keywordMatchScore}%` : "Run an analysis", icon: Target, tone: "text-emerald-300" },
    { label: "Best overall fit", value: summary.bestOverallFit ? `${summary.bestOverallFit.name} - ${summary.bestOverallFit.latestOverallScore ?? 0}%` : "Run an analysis", icon: Target, tone: "text-indigo-300" },
    { label: "Most used resume", value: summary.mostUsed ? `${summary.mostUsed.name} - ${summary.mostUsed.applicationsUsed} applications` : "No resumes", icon: TrendingUp, tone: "text-cyan-300" },
    { label: "Common missing keywords", value: summary.commonMissingKeywords.join(", ") || (summary.analyzed.length ? "No keyword gaps recorded" : "Run an analysis"), icon: Activity, tone: "text-amber-300" },
    { label: "Top next improvement", value: summary.topNextImprovement || (summary.analyzed.length ? "No improvement recorded" : "Run an analysis"), icon: Lightbulb, tone: "text-violet-300" },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-semibold text-white">Resume insights</h2><p className="mt-1 text-sm text-slate-500">Live signals from your analyzed resume library.</p></div>
        <div className="min-w-48">
          <div className="mb-2 flex justify-between text-xs text-slate-400"><span>{summary.analysisCoverage.current} of {summary.analysisCoverage.total} analyzed</span><span>{active} active</span></div>
          <Progress value={resumes.length ? (summary.analysisCoverage.current / resumes.length) * 100 : 0} tone="green" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4" key={insight.label}><Icon className={`size-5 ${insight.tone}`} /><div className="mt-4 text-xs font-medium uppercase text-slate-500">{insight.label}</div><div className="mt-1 text-sm font-semibold leading-6 text-white">{insight.value}</div></div>;
        })}
      </div>
    </section>
  );
}
