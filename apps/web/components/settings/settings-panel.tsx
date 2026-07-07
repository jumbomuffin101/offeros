"use client";

import { useEffect, useState } from "react";
import { BarChart3, BookOpen, BriefcaseBusiness, CheckCircle2, Command, Database, Download, FileText, GraduationCap, Info, Moon, RotateCcw, Smartphone, Upload, Wifi, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { usePwa } from "@/components/pwa/pwa-provider";
import { useWorkspaceActions } from "@/hooks/use-workspace-actions";
import { ESCAPE_EVENT } from "@/lib/action-events";
import type { LocalImportStatus } from "@/lib/data/types/repositories";

const shortcuts = [["Command palette", "Ctrl/Cmd + K"], ["Add application", "Ctrl/Cmd + N"], ["Upload resume", "Shift + R"], ["Shortcut help", "?"], ["Close overlay", "Esc"]];
const helpItems: Array<{ title: string; detail: string; icon: LucideIcon }> = [
  { title: "Applications", detail: "Track SWE internships and new grad roles through applications, OAs, interviews, and offers.", icon: BriefcaseBusiness },
  { title: "Resume Manager", detail: "Organize targeted technical resume versions and record where each version is used.", icon: FileText },
  { title: "Prep Workspace", detail: "Build coding fluency, reusable STAR stories, confidence, and system design judgment.", icon: GraduationCap },
  { title: "Dashboard", detail: "Prioritize technical recruiting work with a daily plan, deadlines, and momentum score.", icon: BookOpen },
  { title: "Analytics", detail: "Review technical pipeline conversion, resume performance, and prep consistency.", icon: BarChart3 },
  { title: "Command Palette", detail: "Press Ctrl/Cmd + K to navigate, create records, and reopen recent work.", icon: Command },
];

type ResetScope = "all" | "applications" | "resumes" | "prep";

export function SettingsPanel() {
  const workspace = useWorkspaceActions();
  const dataMode = workspace.dataMode;
  const checkLocalImport = workspace.checkLocalImport;
  const { canInstall, install, isInstalled, isOnline } = usePwa();
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
  useEffect(() => {
    if (dataMode === "api") void checkLocalImport();
  }, [dataMode, checkLocalImport]);

  function notify(message: string, tone: "success" | "info" = "success") { setToastTone(tone); setToast(message); }
  async function handleInstall() {
    const accepted = await install();
    notify(accepted ? "OfferOS installed" : "Install prompt closed", accepted ? "success" : "info");
  }
  async function reset(scope: ResetScope) {
    if (workspace.running) return;
    const cleared = await workspace.clear(scope);
    if (!cleared) { notify(workspace.error?.message ?? "Unable to reset workspace data", "info"); return; }
    if (scope === "all" && workspace.dataMode === "local") { window.location.reload(); return; }
    setPendingReset(null);
    notify(workspace.dataMode === "api" ? "Demo workspace restored in your cloud account" : `${scope[0].toUpperCase()}${scope.slice(1)} data cleared`);
  }
  async function importLocalWorkspace() {
    const imported = await workspace.importLocalWorkspace();
    if (!imported) { notify(workspace.error?.message ?? "Unable to import local data", "info"); return; }
    notify(importMessage(imported), totalImported(imported) > 0 ? "success" : "info");
  }

  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-3"><Moon className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Appearance</h2><p className="mt-1 text-sm text-slate-500">Theme preference for this local workspace.</p></div></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{["Dark", "System", "Light"].map((theme) => <button className={`rounded-lg border px-3 py-3 text-sm font-medium ${theme === "Dark" ? "border-indigo-400/30 bg-indigo-400/10 text-indigo-100" : "cursor-not-allowed border-slate-700/35 bg-slate-900/20 text-slate-600"}`} disabled={theme !== "Dark"} key={theme} onClick={() => notify("Dark theme is active")} type="button">{theme}</button>)}</div><p className="mt-3 text-xs text-slate-500">System and light themes are planned for a future release.</p></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><Upload className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Import & Export</h2><p className="mt-1 text-sm text-slate-500">{workspace.dataMode === "api" ? "Move browser-local records into your authenticated cloud workspace when needed." : "Portable workspace data is on the roadmap."}</p></div></div></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Button onClick={() => notify("Export is coming soon", "info")} variant="secondary">Export data</Button>{workspace.dataMode === "api" && workspace.localImportStatus?.available ? <Button onClick={() => void importLocalWorkspace()} variant="primary">Import local workspace</Button> : <Button onClick={() => notify(workspace.dataMode === "api" ? "No local workspace records found to import" : "Import is coming soon", "info")} variant="secondary">Import data</Button>}</div>{workspace.dataMode === "api" && workspace.localImportStatus?.available ? <p className="text-xs leading-5 text-slate-500">Found local records on this device: {importStatusLabel(workspace.localImportStatus)}. Import safely skips records already in your cloud account.</p> : null}</CardContent></Card>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Smartphone className="size-5 text-indigo-300" />
          <div>
            <h2 className="text-lg font-semibold text-white">App & Offline</h2>
            <p className="mt-1 text-sm text-slate-500">Install OfferOS and keep this local workspace available on your device.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Install OfferOS</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">Launch it in a standalone window from your home screen or app launcher.</p>
              </div>
              {isInstalled ? <CheckCircle2 className="size-5 shrink-0 text-emerald-300" /> : <Download className="size-5 shrink-0 text-indigo-300" />}
            </div>
            <div className="mt-4">
              {isInstalled ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-sm font-medium text-emerald-200">
                  <CheckCircle2 className="size-4" /> Installed on this device
                </div>
              ) : canInstall ? (
                <Button onClick={() => void handleInstall()} variant="primary"><Download className="size-4" />Install OfferOS</Button>
              ) : (
                <p className="text-xs leading-5 text-slate-500">A direct install prompt is not currently available in this browser. Use the browser instructions alongside.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="size-4 text-emerald-300" /> : <WifiOff className="size-4 text-amber-300" />}
              <span className="text-sm font-semibold text-white">{isOnline ? "Online" : "Offline"}</span>
              <span className="text-xs text-slate-500">Local workspace ready</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{workspace.dataMode === "api" ? "Applications, resumes, and prep data sync to your authenticated OfferOS API account. Recent commands and install preferences stay local to this device." : "Applications, resumes, and prep data stay in this browser's local storage. OfferOS does not sync this data to the cloud."}</p>
            <div className="mt-4 space-y-2 border-t border-slate-700/35 pt-4 text-xs leading-5 text-slate-500">
              <p><span className="font-medium text-slate-300">iPhone or iPad:</span> open Share &rarr; Add to Home Screen.</p>
              <p><span className="font-medium text-slate-300">Chrome desktop:</span> use the Install icon in the address bar when available.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card><CardHeader><div className="flex items-center gap-3"><Database className="size-5 text-amber-300" /><div><h2 className="text-lg font-semibold text-white">{workspace.dataMode === "api" ? "Cloud Data" : "Local Data"}</h2><p className="mt-1 text-sm text-slate-500">{workspace.dataMode === "api" ? "Restore demo data for one cloud workspace area or the full authenticated account." : "Clear one workspace area or restart the full first-run experience."}</p></div></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["applications", "resumes", "prep"] as ResetScope[]).map((scope) => <Button disabled={workspace.running} key={scope} onClick={() => setPendingReset(scope)} variant="secondary"><RotateCcw className="size-4" />{workspace.dataMode === "api" ? "Reset" : "Clear"} {scope}</Button>)}<Button className="border-rose-400/25 text-rose-200 hover:bg-rose-400/10" disabled={workspace.running} onClick={() => setPendingReset("all")} variant="ghost"><RotateCcw className="size-4" />Reset all data</Button></div></CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><div className="flex items-center gap-3"><Command className="size-5 text-indigo-300" /><h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2></div></CardHeader><CardContent className="space-y-2">{shortcuts.map(([label, keys]) => <div className="flex items-center justify-between rounded-lg border border-slate-700/35 bg-slate-900/20 px-3 py-3" key={label}><span className="text-sm text-slate-300">{label}</span><kbd className="rounded-md border border-slate-600/45 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">{keys}</kbd></div>)}</CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><Info className="size-5 text-indigo-300" /><h2 className="text-lg font-semibold text-white">About OfferOS</h2></div></CardHeader><CardContent className="space-y-4"><div><div className="text-sm font-medium text-white">OfferOS</div><p className="mt-1 text-sm leading-6 text-slate-500">Your local-first command center for software engineering recruiting.</p></div><div className="flex items-center justify-between border-t border-slate-700/35 pt-4"><span className="text-sm text-slate-400">Current version</span><span className="text-sm font-semibold text-white">0.1.0</span></div><div className="rounded-lg border border-indigo-400/15 bg-indigo-400/[0.06] p-4"><div className="text-sm font-medium text-indigo-100">Product status</div><div className="mt-3 grid gap-2 text-xs leading-5 text-slate-500 sm:grid-cols-2">{["Cloud sync and accounts", "AI Resume Analysis available when configured", "PDF/DOCX extraction coming soon", "LeetCode profile sync", "Chrome extension job saver", "Company-specific interview prep"].map((item) => <div className="flex items-center gap-2" key={item}><span className="size-1.5 shrink-0 rounded-full bg-indigo-300/70" />{item}</div>)}</div></div></CardContent></Card>
    </div>

    <section><div className="mb-4"><h2 className="text-xl font-semibold text-white">Help Center</h2><p className="mt-1 text-sm text-slate-500">A concise guide to your software engineering recruiting workspace.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{helpItems.map((item) => { const Icon = item.icon; return <div className="rounded-xl border border-slate-700/40 bg-[#1b1d2b] p-4" key={item.title}><Icon className="size-5 text-indigo-300" /><h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p></div>; })}</div></section>

    {pendingReset ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0f18]/80 px-4 backdrop-blur-lg"><section className="glass-card page-enter w-full max-w-md rounded-xl p-6" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-white" id="reset-title">{pendingReset === "all" ? "Reset OfferOS?" : `${workspace.dataMode === "api" ? "Reset" : "Clear"} ${pendingReset} data?`}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{workspace.dataMode === "api" ? "This replaces your authenticated cloud records for this scope with the default demo workspace. Other users are not affected." : pendingReset === "all" ? "This clears all local OfferOS data and shows onboarding again." : "This removes the local records in this workspace area. This cannot be undone."}</p></div><button aria-label="Close reset confirmation" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" disabled={workspace.running} onClick={() => setPendingReset(null)} type="button"><X className="size-4" /></button></div><div className="mt-6 flex justify-end gap-2"><Button disabled={workspace.running} onClick={() => setPendingReset(null)} variant="ghost">Cancel</Button><Button className="border-rose-400/30 bg-rose-400/15 text-rose-100 hover:bg-rose-400/20" disabled={workspace.running} onClick={() => void reset(pendingReset)} variant="secondary">{workspace.running ? "Resetting..." : "Confirm reset"}</Button></div></section></div> : null}
    <Toast message={toast} tone={toastTone} />
  </div>;
}

function totalImported(status: LocalImportStatus) {
  return status.applications + status.resumes + status.codingProblems + status.behavioralQuestions + status.systemDesignPrompts;
}

function importMessage(status: LocalImportStatus) {
  const total = totalImported(status);
  return total > 0 ? `Imported ${total} local records into your cloud workspace` : "Cloud workspace already includes your local records";
}

function importStatusLabel(status: LocalImportStatus) {
  return [
    [status.applications, "applications"],
    [status.resumes, "resumes"],
    [status.codingProblems, "coding"],
    [status.behavioralQuestions, "behavioral"],
    [status.systemDesignPrompts, "system design"],
  ].filter(([count]) => Number(count) > 0).map(([count, label]) => `${count} ${label}`).join(", ");
}
