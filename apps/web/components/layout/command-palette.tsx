"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Code2, FilePlus2, FileText, Gauge, GraduationCap, HelpCircle, Search, Settings, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { ESCAPE_EVENT, requestWorkspaceAction, type WorkspaceAction } from "@/lib/action-events";
import { isOnboardingComplete, readRecentCommands, writeRecentCommands } from "@/lib/data/storage/local/preferencesStorage";

type Command = { label: string; hint: string; icon: LucideIcon; group: "Navigation" | "Create" | "Settings"; href?: string; action?: WorkspaceAction | "help" };

const commands: Command[] = [
  { label: "Open Dashboard", href: "/", icon: Gauge, hint: "Pipeline overview", group: "Navigation" },
  { label: "Open Applications", href: "/applications", icon: BriefcaseBusiness, hint: "Application tracker", group: "Navigation" },
  { label: "Open Resumes", href: "/resumes", icon: FileText, hint: "Resume versions", group: "Navigation" },
  { label: "Open Prep", href: "/prep", icon: GraduationCap, hint: "Daily practice", group: "Navigation" },
  { label: "Open Analytics", href: "/analytics", icon: BarChart3, hint: "Conversion insights", group: "Navigation" },
  { label: "Add Application", icon: FilePlus2, hint: "Create a tracker card", group: "Create", action: "application" },
  { label: "Upload Resume", icon: Upload, hint: "Create a resume version", group: "Create", action: "resume" },
  { label: "Add Coding Problem", icon: Code2, hint: "Add to the prep queue", group: "Create", action: "coding" },
  { label: "Add System Design Prompt", icon: GraduationCap, hint: "Create a design exercise", group: "Create", action: "systemDesign" },
  { label: "Open Settings", href: "/settings", icon: Settings, hint: "Workspace preferences", group: "Settings" },
  { label: "Keyboard Shortcuts", icon: HelpCircle, hint: "View productivity keys", group: "Settings", action: "help" },
];

const shortcutRows = [
  ["Command palette", "Ctrl/Cmd + K"],
  ["Add application", "Ctrl/Cmd + N"],
  ["Upload resume", "Shift + R"],
  ["Shortcut help", "?"],
  ["Close modal or drawer", "Esc"],
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentLabels, setRecentLabels] = useState<string[]>([]);
  const recentlyViewed = useRecentlyViewed();
  const router = useRouter();

  useEffect(() => {
    function runAction(action: WorkspaceAction) {
      router.push(requestWorkspaceAction(action));
    }
    function onKeyDown(event: KeyboardEvent) {
      if (!isOnboardingComplete()) return;
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((current) => !current); setHelpOpen(false); return; }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); runAction("application"); return; }
      if (!typing && event.shiftKey && event.key.toLowerCase() === "r") { event.preventDefault(); runAction("resume"); return; }
      if (!typing && event.key === "?") { event.preventDefault(); setHelpOpen(true); setOpen(false); return; }
      if (event.key === "Escape") { setOpen(false); setHelpOpen(false); window.dispatchEvent(new Event(ESCAPE_EVENT)); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    window.queueMicrotask(() => {
      setRecentLabels(readRecentCommands());
    });
  }, [open]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? commands.filter((command) => `${command.label} ${command.hint} ${command.group}`.toLowerCase().includes(value)) : commands;
  }, [query]);

  function execute(command: Command) {
    setOpen(false); setQuery("");
    if (command.action === "help") setHelpOpen(true);
    else if (command.action) router.push(requestWorkspaceAction(command.action));
    else if (command.href) router.push(command.href);
    const labels = [command.label, ...recentLabels.filter((label) => label !== command.label)].slice(0, 5);
    setRecentLabels(labels);
    writeRecentCommands(labels);
  }

  return <>
    {open ? <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0d0f18]/80 px-4 pt-16 backdrop-blur-lg" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="glass-card page-enter max-h-[78vh] w-full max-w-2xl overflow-hidden rounded-xl" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="flex items-center gap-3 border-b border-slate-700/40 px-5 py-4"><Search className="size-5 text-indigo-200" /><input autoFocus className="command-search h-9 flex-1 text-sm text-white outline-none placeholder:text-slate-500" onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" value={query} /><button aria-label="Close command palette" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setOpen(false)} type="button"><X className="size-4" /></button></div>
        <div className="max-h-[calc(78vh-72px)] overflow-y-auto p-3">
          {!query && recentLabels.length ? <CommandGroup label="Recent Commands" commands={recentLabels.map((label) => commands.find((command) => command.label === label)).filter((command): command is Command => Boolean(command))} onExecute={execute} /> : null}
          {!query && recentlyViewed.length ? <div className="mb-3"><div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Recently Viewed</div>{recentlyViewed.map((item) => <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.055]" key={`${item.type}-${item.id}`} onClick={() => { setOpen(false); router.push(item.href); }} type="button"><span className="flex size-9 items-center justify-center rounded-lg border border-slate-700/40 bg-slate-800/35 text-indigo-200"><FileText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{item.label}</span><span className="block truncate text-xs text-slate-500">{item.type} · {item.detail}</span></span></button>)}</div> : null}
          {(["Navigation", "Create", "Settings"] as const).map((group) => <CommandGroup commands={filtered.filter((command) => command.group === group)} key={group} label={group} onExecute={execute} />)}
          {!filtered.length ? <div className="px-4 py-10 text-center text-sm text-slate-500">No commands match “{query}”.</div> : null}
        </div>
      </section>
    </div> : null}
    {helpOpen ? <ShortcutHelp onClose={() => setHelpOpen(false)} /> : null}
  </>;
}

function CommandGroup({ label, commands: items, onExecute }: { label: string; commands: Command[]; onExecute: (command: Command) => void }) {
  if (!items.length) return null;
  return <div className="mb-3"><div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</div>{items.map((command) => { const Icon = command.icon; return <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400/35" key={command.label} onClick={() => onExecute(command)} type="button"><span className="flex size-9 items-center justify-center rounded-lg border border-slate-700/40 bg-slate-800/35 text-indigo-200"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{command.label}</span><span className="block text-xs text-slate-500">{command.hint}</span></span></button>; })}</div>;
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d0f18]/80 px-4 backdrop-blur-lg" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="glass-card page-enter w-full max-w-lg rounded-xl" role="dialog" aria-modal="true" aria-labelledby="shortcut-title"><div className="flex items-center justify-between border-b border-slate-700/40 px-5 py-4"><div><h2 className="font-semibold text-white" id="shortcut-title">Keyboard shortcuts</h2><p className="mt-1 text-xs text-slate-500">Move through OfferOS without leaving the keyboard.</p></div><button aria-label="Close keyboard shortcuts" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><X className="size-4" /></button></div><div className="space-y-2 p-5">{shortcutRows.map(([label, keys]) => <div className="flex items-center justify-between rounded-lg border border-slate-700/35 bg-slate-900/25 px-3 py-3" key={label}><span className="text-sm text-slate-300">{label}</span><kbd className="rounded-md border border-slate-600/45 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">{keys}</kbd></div>)}</div></section></div>;
}
