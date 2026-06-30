import { Copy, Eye, FileText } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { formatResumeDate } from "@/lib/resume-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function ResumeCard({
  resume,
  onOpen,
  onDuplicate,
}: {
  resume: ResumeVersion;
  onOpen: () => void;
  onDuplicate: () => void;
}) {
  return (
    <article
      className={`premium-hover group relative rounded-2xl border p-5 transition ${
        resume.status === "Active"
          ? "border-emerald-300/20 bg-emerald-300/[0.035] shadow-[0_18px_60px_rgba(16,185,129,0.055)]"
          : "border-white/10 bg-white/[0.025]"
      }`}
    >
      <button aria-label={`View ${resume.name}`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300/50" onClick={onOpen} type="button" />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
            <FileText className="size-4" />
          </div>
          <h2 className="truncate text-lg font-semibold text-white">{resume.name}</h2>
          <p className="mt-1 text-sm font-medium text-cyan-100/80">{resume.targetRole}</p>
        </div>
        <Badge tone={resume.status === "Active" ? "green" : "amber"}>{resume.status}</Badge>
      </div>

      <p className="pointer-events-none relative z-10 mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">{resume.description}</p>
      <div className="pointer-events-none relative z-10 mt-4 flex min-h-7 flex-wrap gap-2">
        {resume.tags.slice(0, 3).map((tag) => (
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-400" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="pointer-events-none relative z-10 mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Last updated</div>
          <div className="mt-1 font-medium text-slate-100">{formatResumeDate(resume.updatedAt)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Applications</div>
          <div className="mt-1 font-medium text-slate-100">{resume.applicationsUsed}</div>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">Keyword match</span>
          <span className="font-semibold text-white">{resume.keywordMatchScore}%</span>
        </div>
        <Progress className="h-2.5" value={resume.keywordMatchScore} tone={resume.keywordMatchScore >= 85 ? "green" : "cyan"} />
      </div>

      <div className="relative z-20 mt-5 grid grid-cols-2 gap-2">
        <Button className="px-2" onClick={onOpen} variant="ghost"><Eye className="size-4" />View</Button>
        <Button className="px-2" onClick={onDuplicate} variant="ghost"><Copy className="size-4" />Duplicate</Button>
      </div>
    </article>
  );
}
