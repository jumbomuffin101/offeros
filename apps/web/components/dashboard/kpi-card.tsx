import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <Card className="group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24">
      <CardContent className="relative">
        <div className="absolute inset-x-0 top-0 h-px accent-line opacity-70" />
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-cyan-200">
            {icon}
          </div>
          <ArrowUpRight className="size-4 text-slate-500 transition group-hover:text-cyan-200" />
        </div>
        <div className="mt-5 text-3xl font-semibold text-white">{value}</div>
        <div className="mt-2 text-sm font-medium text-slate-200">{label}</div>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
