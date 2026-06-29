import { AlertTriangle, CheckCircle2, Lightbulb, Target } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const insights = [
  {
    label: "Weak bullets detected",
    value: "4",
    helper: "Add measurable impact to backend and AI project bullets.",
    icon: AlertTriangle,
    tone: "text-amber-300",
  },
  {
    label: "Missing keywords",
    value: "Kafka, Postgres, testing",
    helper: "Most relevant for backend and fintech roles.",
    icon: Target,
    tone: "text-cyan-300",
  },
  {
    label: "Strongest project section",
    value: "Distributed job tracker",
    helper: "High signal for reliability and API design.",
    icon: CheckCircle2,
    tone: "text-emerald-300",
  },
  {
    label: "Suggested next improvement",
    value: "Rewrite first project bullet",
    helper: "Lead with scale, latency, and user impact.",
    icon: Lightbulb,
    tone: "text-violet-300",
  },
];

export function ResumeInsights() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Resume Insights</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mock review signals to help decide which version to improve next.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon;

          return (
            <div
              key={insight.label}
              className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-cyan-300/20 hover:bg-white/[0.045]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Icon className={`size-5 ${insight.tone}`} />
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
                  Insight
                </span>
              </div>
              <div className="text-sm font-medium text-slate-400">{insight.label}</div>
              <div className="mt-1 text-base font-semibold text-white">{insight.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{insight.helper}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
