import { Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const plan = [
  { label: "Apply to 3 companies", complete: false },
  { label: "Solve 1 coding problem", complete: true },
  { label: "Review 1 behavioral answer", complete: false },
  { label: "Follow up with recruiter", complete: false },
];

export function RecruitingPlan() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Today&apos;s Recruiting Plan</h2>
        <p className="mt-1 text-sm text-slate-500">A focused set of actions for today.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.map((item, index) => (
          <div
            key={item.label}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3.5 transition hover:border-cyan-300/20 hover:bg-white/[0.055]"
          >
            {item.complete ? (
              <span className="flex size-6 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.15)]">
                <Check className="size-3.5" />
              </span>
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full border border-slate-600 bg-slate-950/60 text-slate-600 transition group-hover:border-cyan-300/40 group-hover:text-cyan-200">
                <Circle className="size-3.5" />
              </span>
            )}
            <span className="flex-1 text-sm text-slate-200">{item.label}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-500">
              {index === 0 ? "High" : "Today"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
