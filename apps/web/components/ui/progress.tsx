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
    cyan: "from-cyan-300 to-blue-500",
    green: "from-emerald-300 to-teal-500",
    amber: "from-amber-300 to-orange-500",
    purple: "from-violet-300 to-fuchsia-500",
    red: "from-rose-300 to-red-500",
  };

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-800", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r", tones[tone])}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
