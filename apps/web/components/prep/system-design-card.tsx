import { Check, Network, Pencil, Plus } from "lucide-react";
import type { PrepStatus, SystemDesignPrompt } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PrepStatusSelect } from "@/components/prep/prep-status-select";

export function SystemDesignCard({ prompts, onAdd, onEdit, onStatus }: {
  prompts: SystemDesignPrompt[];
  onAdd: () => void;
  onEdit: (prompt: SystemDesignPrompt) => void;
  onStatus: (prompt: SystemDesignPrompt, status: PrepStatus) => void;
}) {
  return <Card className="premium-hover"><CardHeader className="flex flex-row items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5 text-emerald-200"><Network className="size-5" /></span><div><h2 className="text-lg font-semibold text-white">System design prep</h2><p className="text-sm text-slate-500">Practice requirements, architecture tradeoffs, and technical communication.</p></div></div><Button className="px-3" onClick={onAdd} variant="ghost"><Plus className="size-4" />Add</Button></CardHeader><CardContent className="space-y-3">
    {prompts.length ? prompts.map((prompt) => <article className={`rounded-2xl border p-4 transition ${prompt.status === "Completed" ? "border-emerald-300/20 bg-emerald-300/[0.035]" : "border-white/10 bg-white/[0.025]"}`} key={prompt.id}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-white">{prompt.title}</h3>{prompt.status === "Completed" ? <Check className="size-4 text-emerald-300" /> : null}</div><p className="mt-2 text-sm leading-6 text-slate-500">{prompt.prompt}</p><div className="mt-3 flex flex-wrap gap-2">{prompt.concepts.map((concept) => <Badge key={concept} tone="green">{concept}</Badge>)}</div>{prompt.notes ? <p className="mt-3 text-xs leading-5 text-slate-500">Notes: {prompt.notes}</p> : null}</div><div className="flex shrink-0 gap-2"><PrepStatusSelect label={`${prompt.title} status`} value={prompt.status} onChange={(status) => onStatus(prompt, status)} /><Button aria-label={`Edit ${prompt.title}`} className="px-3" onClick={() => onEdit(prompt)} title={`Edit ${prompt.title}`} variant="ghost"><Pencil className="size-4" /></Button></div></div></article>) : <div className="py-10 text-center"><Network className="mx-auto size-7 text-slate-600" /><p className="mt-3 text-sm text-slate-500">Add a design prompt to start practicing.</p><Button className="mt-4" onClick={onAdd} variant="primary">Add prompt</Button></div>}
  </CardContent></Card>;
}
