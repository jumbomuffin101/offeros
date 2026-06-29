import { Award, FileText, Target, TrendingUp } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/types";
import {
  applications,
  applicationsOverTime,
  prepConsistency,
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

export function AnalyticsDashboard({ metrics }: { metrics: AnalyticsMetric[] }) {
  const maxApplications = Math.max(...applicationsOverTime.map((item) => item.value));
  const categoryCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.category] = (acc[application.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardContent>
              <div className={`text-sm font-medium ${toneText[metric.tone]}`}>
                {metric.label}
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">{metric.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{metric.helper}</p>
              <div className="mt-4 text-xs font-medium text-slate-300">{metric.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Applications Over Time</h2>
          </CardHeader>
          <CardContent>
            <div className="flex h-60 items-end gap-4">
              {applicationsOverTime.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-cyan-500/60 to-violet-300"
                    style={{ height: `${(item.value / maxApplications) * 100}%` }}
                  />
                  <div className="text-xs text-slate-500">{item.label}</div>
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
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Prep Consistency</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              {prepConsistency.map((day) => (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="h-28 w-full rounded-lg bg-slate-800">
                    <div
                      className="mt-auto rounded-lg bg-gradient-to-t from-emerald-500/70 to-cyan-300"
                      style={{ height: `${day.value}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Award className="mb-4 size-6 text-emerald-300" />
            <h2 className="text-lg font-semibold text-white">Most Effective Resume Version</h2>
            <div className="mt-4 text-3xl font-semibold text-white">Backend Resume</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Highest current keyword score and strongest response rate across backend and fintech roles.
            </p>
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
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"
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
