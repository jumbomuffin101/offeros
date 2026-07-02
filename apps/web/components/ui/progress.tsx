import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "cyan",
}: {
  value: number;
  className?: string;
  tone?: "cyan" | "green" | "amber" | "purple" | "red";
}) {
  const tones = {
    cyan: "bg-indigo-400",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    purple: "bg-violet-400",
    red: "bg-rose-400",
  };

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-800/85 ring-1 ring-slate-700/45", className)}>
      <div
        className={cn("progress-fill h-full rounded-full", tones[tone])}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
