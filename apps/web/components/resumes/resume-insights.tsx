import { Activity, Lightbulb, Target, TrendingUp } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { mostCommonMissingKeywords } from "@/lib/resume-utils";
import { Progress } from "@/components/ui/progress";

export function ResumeInsights({ resumes }: { resumes: ResumeVersion[] }) {
  const best = [...resumes].sort((a, b) => b.keywordMatchScore - a.keywordMatchScore)[0];
  const mostUsed = [...resumes].sort((a, b) => b.applicationsUsed - a.applicationsUsed)[0];
  const missing = mostCommonMissingKeywords(resumes);
  const improvement = best?.suggestedImprovement || resumes.find((resume) => resume.suggestedImprovement)?.suggestedImprovement;
  const active = resumes.filter((resume) => resume.status === "Active").length;

  const insights = [
    { label: "Best keyword match", value: best ? `${best.name} · ${best.keywordMatchScore}%` : "No data", icon: Target, tone: "text-emerald-300" },
    { label: "Most used resume", value: mostUsed ? `${mostUsed.name} · ${mostUsed.applicationsUsed} applications` : "No data", icon: TrendingUp, tone: "text-cyan-300" },
    { label: "Common missing keywords", value: missing.join(", ") || "None recorded", icon: Activity, tone: "text-amber-300" },
    { label: "Top next improvement", value: improvement || "No improvement recorded", icon: Lightbulb, tone: "text-violet-300" },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-semibold text-white">Resume insights</h2><p className="mt-1 text-sm text-slate-500">Live signals from your current resume library.</p></div>
        <div className="min-w-48">
          <div className="mb-2 flex justify-between text-xs text-slate-400"><span>{active} active</span><span>{resumes.length - active} draft</span></div>
          <Progress value={resumes.length ? (active / resumes.length) * 100 : 0} tone="green" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4" key={insight.label}><Icon className={`size-5 ${insight.tone}`} /><div className="mt-4 text-xs font-medium uppercase text-slate-500">{insight.label}</div><div className="mt-1 text-sm font-semibold leading-6 text-white">{insight.value}</div></div>;
        })}
      </div>
    </section>
  );
}
