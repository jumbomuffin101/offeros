import { CheckCircle2, Info } from "lucide-react";

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "info" }) {
  if (!message) return null;
  const Icon = tone === "success" ? CheckCircle2 : Info;
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-xl border border-slate-600/45 bg-[#202336]/95 px-4 py-3 text-sm font-medium text-slate-100 shadow-xl shadow-black/25 backdrop-blur-xl" role="status" aria-live="polite">
      <Icon className={`size-4 shrink-0 ${tone === "success" ? "text-emerald-300" : "text-indigo-300"}`} />
      {message}
    </div>
  );
}
