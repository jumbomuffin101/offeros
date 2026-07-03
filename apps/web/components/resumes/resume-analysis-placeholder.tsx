import { ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ResumeAnalysisPlaceholder() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-violet-400/15 bg-violet-400/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
          <ScanSearch className="size-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">AI resume analysis</h2>
            <Badge tone="purple">Coming soon</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Analyze a resume against a target SWE role or job description to surface missing keywords, weak bullets, and fit score.
          </p>
        </div>
      </div>
    </section>
  );
}
