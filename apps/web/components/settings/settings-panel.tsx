"use client";

import { useEffect, useState } from "react";
import { BarChart3, BookOpen, BriefcaseBusiness, Command, Database, FileText, GraduationCap, Info, Moon, RotateCcw, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { saveStoredApplications } from "@/lib/application-storage";
import { saveStoredResumes } from "@/lib/resume-storage";
import { saveStoredPrep } from "@/lib/prep-storage";
import { clearAllOfferOSData, emptyPrepWorkspace, RECENTLY_VIEWED_KEY } from "@/lib/workspace-data";
import { ESCAPE_EVENT } from "@/lib/action-events";

const shortcuts = [["Command palette", "Ctrl/Cmd + K"], ["Add application", "Ctrl/Cmd + N"], ["Upload resume", "Shift + R"], ["Shortcut help", "?"], ["Close overlay", "Esc"]];
const helpItems: Array<{ title: string; detail: string; icon: LucideIcon }> = [
  { title: "Applications", detail: "Track roles through every recruiting stage, including deadlines and recruiter details.", icon: BriefcaseBusiness },
  { title: "Resume Manager", detail: "Keep targeted resume versions organized and record where each one is used.", icon: FileText },
  { title: "Prep Workspace", detail: "Practice coding, behavioral stories, and system design with weekly goals.", icon: GraduationCap },
  { title: "Dashboard", detail: "Use the daily plan, quick actions, deadlines, and momentum score to prioritize work.", icon: BookOpen },
  { title: "Analytics", detail: "Review pipeline conversion, resume performance, and prep consistency from local data.", icon: BarChart3 },
  { title: "Command Palette", detail: "Press Ctrl/Cmd + K to navigate, create records, and reopen recent work.", icon: Command },
];

type ResetScope = "all" | "applications" | "resumes" | "prep";

export function SettingsPanel() {
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "info">("success");
  const [pendingReset, setPendingReset] = useState<ResetScope | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function closeConfirmation() { setPendingReset(null); }
    window.addEventListener(ESCAPE_EVENT, closeConfirmation);
    return () => window.removeEventListener(ESCAPE_EVENT, closeConfirmation);
  }, []);

  function notify(message: string, tone: "success" | "info" = "success") { setToastTone(tone); setToast(message); }
  function reset(scope: ResetScope) {
    if (scope === "all") { clearAllOfferOSData(); window.location.reload(); return; }
    if (scope === "applications") saveStoredApplications([]);
    if (scope === "resumes") saveStoredResumes([]);
    if (scope === "prep") saveStoredPrep(emptyPrepWorkspace());
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    setPendingReset(null); notify(`${scope[0].toUpperCase()}${scope.slice(1)} data cleared`);
  }

  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-3"><Moon className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Appearance</h2><p className="mt-1 text-sm text-slate-500">Theme preference for this local workspace.</p></div></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{["Dark", "System", "Light"].map((theme) => <button className={`rounded-lg border px-3 py-3 text-sm font-medium ${theme === "Dark" ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-100" : "cursor-not-allowed border-slate-700/35 bg-slate-900/20 text-slate-600"}`} disabled={theme !== "Dark"} key={theme} onClick={() => notify("Dark theme is active")} type="button">{theme}</button>)}</div><p className="mt-3 text-xs text-slate-500">System and light themes are planned for a future release.</p></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><Upload className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Import & Export</h2><p className="mt-1 text-sm text-slate-500">Portable workspace data is on the roadmap.</p></div></div></CardHeader><CardContent className="flex flex-wrap gap-2"><Button onClick={() => notify("Export is coming soon", "info")} variant="secondary">Export data</Button><Button onClick={() => notify("Import is coming soon", "info")} variant="secondary">Import data</Button></CardContent></Card>
    </div>

    <Card><CardHeader><div className="flex items-center gap-3"><Database className="size-5 text-amber-300" /><div><h2 className="text-lg font-semibold text-white">Local Data</h2><p className="mt-1 text-sm text-slate-500">Clear one workspace area or restart the full first-run experience.</p></div></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["applications", "resumes", "prep"] as ResetScope[]).map((scope) => <Button key={scope} onClick={() => setPendingReset(scope)} variant="secondary"><RotateCcw className="size-4" />Clear {scope}</Button>)}<Button className="border-rose-400/25 text-rose-200 hover:bg-rose-400/10" onClick={() => setPendingReset("all")} variant="ghost"><RotateCcw className="size-4" />Reset all data</Button></div></CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><div className="flex items-center gap-3"><Command className="size-5 text-indigo-300" /><h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2></div></CardHeader><CardContent className="space-y-2">{shortcuts.map(([label, keys]) => <div className="flex items-center justify-between rounded-lg border border-slate-700/35 bg-slate-900/20 px-3 py-3" key={label}><span className="text-sm text-slate-300">{label}</span><kbd className="rounded-md border border-slate-600/45 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">{keys}</kbd></div>)}</CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><Info className="size-5 text-indigo-300" /><h2 className="text-lg font-semibold text-white">About OfferOS</h2></div></CardHeader><CardContent className="space-y-4"><div><div className="text-sm font-medium text-white">OfferOS</div><p className="mt-1 text-sm leading-6 text-slate-500">A local-first operating system for software engineering recruiting.</p></div><div className="flex items-center justify-between border-t border-slate-700/35 pt-4"><span className="text-sm text-slate-400">Current version</span><span className="text-sm font-semibold text-white">0.1.0</span></div><div className="rounded-lg border border-indigo-400/15 bg-indigo-400/[0.06] p-4"><div className="text-sm font-medium text-indigo-100">Roadmap</div><p className="mt-1 text-sm leading-6 text-slate-500">Portable data, calendar sync, reminders, and additional themes.</p></div></CardContent></Card>
    </div>

    <section><div className="mb-4"><h2 className="text-xl font-semibold text-white">Help Center</h2><p className="mt-1 text-sm text-slate-500">A concise guide to the core OfferOS workspace.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{helpItems.map((item) => { const Icon = item.icon; return <div className="rounded-xl border border-slate-700/40 bg-[#1b1d2b] p-4" key={item.title}><Icon className="size-5 text-indigo-300" /><h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p></div>; })}</div></section>

    {pendingReset ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0f18]/80 px-4 backdrop-blur-lg"><section className="glass-card page-enter w-full max-w-md rounded-xl p-6" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-white" id="reset-title">{pendingReset === "all" ? "Reset OfferOS?" : `Clear ${pendingReset} data?`}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{pendingReset === "all" ? "This clears all local OfferOS data and shows onboarding again." : "This removes the local records in this workspace area. This cannot be undone."}</p></div><button aria-label="Close reset confirmation" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setPendingReset(null)} type="button"><X className="size-4" /></button></div><div className="mt-6 flex justify-end gap-2"><Button onClick={() => setPendingReset(null)} variant="ghost">Cancel</Button><Button className="border-rose-400/30 bg-rose-400/15 text-rose-100 hover:bg-rose-400/20" onClick={() => reset(pendingReset)} variant="secondary">Confirm reset</Button></div></section></div> : null}
    <Toast message={toast} tone={toastTone} />
  </div>;
}
