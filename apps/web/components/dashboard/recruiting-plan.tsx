import { CheckCircle2, Circle } from "lucide-react";
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
        {plan.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3"
          >
            {item.complete ? (
              <CheckCircle2 className="size-5 text-emerald-300" />
            ) : (
              <Circle className="size-5 text-slate-600" />
            )}
            <span className="text-sm text-slate-200">{item.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
