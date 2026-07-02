"use client";

import { useRouter } from "next/navigation";
import { Code2, FilePlus2, Network, Upload } from "lucide-react";
import { requestWorkspaceAction, type WorkspaceAction } from "@/lib/action-events";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const actions: Array<{ label: string; detail: string; action: WorkspaceAction; icon: typeof FilePlus2 }> = [
  { label: "Add Application", detail: "Track a new opportunity", action: "application", icon: FilePlus2 },
  { label: "Upload Resume", detail: "Create a targeted version", action: "resume", icon: Upload },
  { label: "Start Coding Prep", detail: "Add today’s focused problem", action: "coding", icon: Code2 },
  { label: "Add System Design Prompt", detail: "Plan a design practice session", action: "systemDesign", icon: Network },
];

export function QuickActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const content = <div className={`grid gap-2 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>{actions.slice(0, compact ? 3 : 4).map((item) => { const Icon = item.icon; return <button className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-900/25 p-3 text-left transition hover:border-indigo-400/25 hover:bg-indigo-400/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-400/35" key={item.action} onClick={() => router.push(requestWorkspaceAction(item.action))} type="button"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-400/10 text-indigo-200"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-medium text-white">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span></button>; })}</div>;
  if (compact) return content;
  return <Card><CardHeader><h2 className="text-lg font-semibold text-white">Quick Actions</h2><p className="mt-1 text-sm text-slate-500">Move the recruiting workflow forward without changing context.</p></CardHeader><CardContent>{content}</CardContent></Card>;
}
