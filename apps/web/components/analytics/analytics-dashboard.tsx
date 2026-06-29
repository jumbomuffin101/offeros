import { Award, FileText, Target, TrendingUp } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/types";
import {
  applications,
  applicationsOverTime,
  prepConsistency,
  resumes,
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const toneText = {
  cyan: "text-cyan-300",
  green: "text-emerald-300",
  amber: "text-amber-300",
  red: "text-rose-300",
  purple: "text-violet-300",
};

const conversionSteps = [
  { label: "Applied", value: 6, percent: 100 },
  { label: "OA", value: 1, percent: 25 },
  { label: "Interview", value: 2, percent: 33 },
  { label: "Offer", value: 1, percent: 17 },
];

export function AnalyticsDashboard({ metrics }: { metrics: AnalyticsMetric[] }) {
  const maxApplications = Math.max(...applicationsOverTime.map((item) => item.value));
  const categoryCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.category] = (acc[application.category] ?? 0) + 1;
    return acc;
  }, {});
  const sparklinePoints = applicationsOverTime
    .map((item, index) => `${index * 34},${70 - (item.value / maxApplications) * 56}`)
    .join(" ");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card className="premium-hover" key={metric.id}>
            <CardContent>
              <div className={`text-sm font-medium ${toneText[metric.tone]}`}>
                {metric.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{metric.value}</div>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{metric.helper}</p>
              <div className="mt-4 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-medium text-slate-300">
                {metric.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Applications Over Time</h2>
                <p className="mt-1 text-sm text-slate-500">Weekly application velocity with current trend.</p>
              </div>
              <TrendingUp className="size-5 text-cyan-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
              <svg className="h-28 w-full overflow-visible" viewBox="0 0 102 78" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="applicationsLine" x1="0" x2="1" y1="0" y2="0">
                    <stop stopColor="#22d3ee" />
                    <stop offset="0.55" stopColor="#a78bfa" />
                    <stop offset="1" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  points={sparklinePoints}
                  stroke="url(#applicationsLine)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
              </svg>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {applicationsOverTime.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="mt-1 text-xl font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Conversion Funnel</h2>
            <p className="mt-1 text-sm text-slate-500">Where applications are turning into signal.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversionSteps.map((step, index) => (
              <div key={step.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">{step.label}</span>
                  <span className="font-semibold text-white">{step.value}</span>
                </div>
                <div className="h-8 rounded-2xl border border-white/10 bg-slate-950/45 p-1">
                  <div
                    className="progress-fill h-full rounded-xl bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300"
                    style={{ width: `${Math.max(step.percent - index * 8, 14)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Prep Consistency</h2>
            <p className="mt-1 text-sm text-slate-500">Daily completion strength this week.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {prepConsistency.map((day) => (
                <div key={day.label} className="space-y-2">
                  <div
                    className="aspect-square rounded-2xl border border-white/10"
                    style={{
                      background: `rgba(34, 211, 238, ${0.12 + day.value / 140})`,
                    }}
                  />
                  <span className="block text-center text-xs text-slate-500">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Top Company Categories</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryCounts).map(([category, value]) => (
              <div key={category}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">{category}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
                <Progress value={(value / applications.length) * 100} tone="cyan" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="premium-hover">
          <CardContent>
            <Award className="mb-4 size-6 text-emerald-300" />
            <h2 className="text-lg font-semibold text-white">Most Effective Resume Version</h2>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-white">Backend Resume</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Highest keyword score and strongest fit across backend and fintech roles.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Resume Performance</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumes.map((resume) => (
              <div key={resume.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{resume.name}</span>
                  <span className="font-semibold text-white">{resume.keywordMatchScore}%</span>
                </div>
                <Progress
                  value={resume.keywordMatchScore}
                  tone={resume.keywordMatchScore > 85 ? "green" : "purple"}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            {[
              [TrendingUp, "OA conversion rate", "25%"],
              [Target, "Interview conversion rate", "13%"],
              [FileText, "Resume versions used", "5"],
            ].map(([Icon, label, value]) => {
              const IconComponent = Icon as typeof TrendingUp;
              return (
                <div
                  key={label as string}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="size-4 text-cyan-300" />
                    <span className="text-sm text-slate-400">{label as string}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{value as string}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
