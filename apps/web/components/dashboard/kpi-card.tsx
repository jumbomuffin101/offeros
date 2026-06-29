import type { ReactNode } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  helper,
  trend,
  sparkline,
  tone = "cyan",
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  trend: string;
  sparkline: number[];
  tone?: "cyan" | "green" | "amber" | "purple";
  icon: ReactNode;
}) {
  const tones = {
    cyan: "from-cyan-300 to-blue-500 text-cyan-200",
    green: "from-emerald-300 to-teal-500 text-emerald-200",
    amber: "from-amber-300 to-orange-500 text-amber-200",
    purple: "from-violet-300 to-fuchsia-500 text-violet-200",
  };

  return (
    <Card className="premium-hover group overflow-hidden">
      <CardContent className="relative">
        <div className="absolute inset-x-0 top-0 h-px accent-line opacity-70" />
        <div className="flex items-start justify-between gap-4">
          <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-2.5", tones[tone])}>
            {icon}
          </div>
          <ArrowUpRight className="size-4 text-slate-500 transition group-hover:text-cyan-200" />
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
            <div className="mt-2 text-sm font-medium text-slate-200">{label}</div>
          </div>
          <div className="flex h-10 items-end gap-1">
            {sparkline.map((point, index) => (
              <span
                className={cn("w-1.5 rounded-full bg-gradient-to-t", tones[tone])}
                key={`${label}-${index}`}
                style={{ height: `${Math.max(point, 18)}%` }}
              />
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-medium text-slate-300">
          <TrendingUp className="size-3.5 text-emerald-300" />
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}
