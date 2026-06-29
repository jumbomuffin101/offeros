import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "cyan" | "green" | "amber" | "red" | "purple" | "slate";

const tones: Record<BadgeTone, string> = {
  cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]",
  green: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.08)]",
  amber: "border-amber-300/30 bg-amber-400/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.08)]",
  red: "border-rose-300/30 bg-rose-400/10 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.08)]",
  purple: "border-violet-300/30 bg-violet-400/10 text-violet-100 shadow-[0_0_18px_rgba(167,139,250,0.08)]",
  slate: "border-slate-400/22 bg-slate-500/10 text-slate-300",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
