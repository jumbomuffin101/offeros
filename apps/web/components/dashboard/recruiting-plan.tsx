import { Check, Circle } from "lucide-react";
import type { RecruitingPlanItem } from "@/lib/dashboard-utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function RecruitingPlan({ items }: { items: RecruitingPlanItem[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Today&apos;s Recruiting Plan</h2>
        <p className="mt-1 text-sm text-slate-500">A focused set of actions for today.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3.5 transition hover:border-cyan-300/20 hover:bg-white/[0.055]"
          >
            {item.complete ? (
              <span className="flex size-6 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                <Check className="size-3.5" />
              </span>
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full border border-slate-600 bg-slate-950/60 text-slate-600 transition group-hover:border-cyan-300/40 group-hover:text-cyan-200">
                <Circle className="size-3.5" />
              </span>
            )}
            <span className="min-w-0 flex-1"><span className="block text-sm text-slate-200">{item.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span></span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-500">
              {item.priority}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
