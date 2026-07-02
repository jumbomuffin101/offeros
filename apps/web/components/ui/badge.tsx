import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "cyan" | "green" | "amber" | "red" | "purple" | "slate";

const tones: Record<BadgeTone, string> = {
  cyan: "border-indigo-400/25 bg-indigo-400/10 text-indigo-200",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  red: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  purple: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  slate: "border-slate-500/35 bg-slate-500/10 text-slate-300",
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
