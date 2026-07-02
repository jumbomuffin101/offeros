import { Copy, FileText, Pencil, Power, Trash2, X } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { formatResumeDate } from "@/lib/resume-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function ResumeDetailDrawer({ resume, onClose, onEdit, onDuplicate, onDelete, onToggleStatus }: {
  resume: ResumeVersion | null;
  onClose: () => void;
  onEdit: (resume: ResumeVersion) => void;
  onDuplicate: (resume: ResumeVersion) => void;
  onDelete: (resume: ResumeVersion) => void;
  onToggleStatus: (resume: ResumeVersion) => void;
}) {
  if (!resume) return null;
  return (
    <div className="fixed inset-0 z-40 bg-[#0d0f18]/72 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="page-enter ml-auto flex h-full w-full max-w-xl flex-col border-l border-slate-700/40 bg-[#1b1d2b]/98 shadow-xl shadow-black/25" role="dialog" aria-modal="true" aria-labelledby="resume-detail-title">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0"><div className="mb-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200"><FileText className="size-4" /></span><Badge tone={resume.status === "Active" ? "green" : "amber"}>{resume.status}</Badge></div><h2 className="text-xl font-semibold text-white" id="resume-detail-title">{resume.name}</h2><p className="mt-1 text-sm text-cyan-100/75">{resume.targetRole}</p></div>
          <button aria-label="Close resume details" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <p className="text-sm leading-6 text-slate-400">{resume.description || "No description recorded."}</p>
          <div><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">Keyword match</span><strong className="text-white">{resume.keywordMatchScore}%</strong></div><Progress className="h-2.5" value={resume.keywordMatchScore} tone={resume.keywordMatchScore >= 85 ? "green" : "cyan"} /></div>
          <div className="grid grid-cols-2 gap-3"><Metric label="Last updated" value={formatResumeDate(resume.updatedAt)} /><Metric label="Applications used" value={String(resume.applicationsUsed)} /><Metric label="File name" value={resume.fileName || "Not attached"} /><Metric label="Created" value={formatResumeDate(resume.createdAt)} /></div>
          <List label="Tags" items={resume.tags} /><List label="Strengths" items={resume.strengths} tone="green" /><List label="Weaknesses" items={resume.weaknesses} tone="amber" /><List label="Missing keywords" items={resume.missingKeywords} tone="red" />
          <TextBlock label="Suggested next improvement" value={resume.suggestedImprovement} /><TextBlock label="Notes" value={resume.notes} />
          <div className="border-t border-white/10 pt-4 text-xs text-slate-600">Created {resume.createdAt} · Updated {resume.updatedAt}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4 sm:grid-cols-4">
          <Button onClick={() => onEdit(resume)} variant="ghost"><Pencil className="size-4" />Edit</Button>
          <Button onClick={() => onDuplicate(resume)} variant="ghost"><Copy className="size-4" />Duplicate</Button>
          <Button onClick={() => onToggleStatus(resume)} variant="ghost"><Power className="size-4" />{resume.status === "Active" ? "Draft" : "Activate"}</Button>
          <Button className="text-rose-200 hover:bg-rose-300/10" onClick={() => onDelete(resume)} variant="ghost"><Trash2 className="size-4" />Delete</Button>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-100">{value}</div></div>; }
function List({ label, items, tone = "slate" }: { label: string; items: string[]; tone?: "slate" | "green" | "amber" | "red" }) { return <div><h3 className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</h3><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <Badge key={item} tone={tone}>{item}</Badge>) : <span className="text-sm text-slate-600">None recorded</span>}</div></div>; }
function TextBlock({ label, value }: { label: string; value: string }) { return <div><h3 className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</h3><p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">{value || "None recorded"}</p></div>; }
