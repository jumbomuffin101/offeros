"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Download, Gauge, RotateCcw, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLaunchSettings } from "@/hooks/use-launch";
import { launchRepository } from "@/lib/data/repositories/launchRepository";
import type { AIUsageSummary } from "@/lib/types";

export function LaunchSettings() {
  const settings = useLaunchSettings();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [usage, setUsage] = useState<AIUsageSummary | null>(null);
  const [draft, setDraft] = useState({ applications: 5, coding: 5, interviews: 2, followUps: 3 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!settings.settings) return;
    const value = settings.settings;
    window.queueMicrotask(() => setDraft({
      applications: value.weeklyApplicationGoal,
      coding: value.weeklyCodingGoal,
      interviews: value.weeklyMockInterviewGoal,
      followUps: value.weeklyFollowUpGoal,
    }));
  }, [settings.settings]);
  useEffect(() => {
    void launchRepository.usage().then(setUsage).catch(() => setUsage(null));
  }, []);

  async function saveGoals() {
    setBusy("goals");
    setMessage("");
    try {
      await settings.update({
        weeklyApplicationGoal: draft.applications,
        weeklyCodingGoal: draft.coding,
        weeklyMockInterviewGoal: draft.interviews,
        weeklyFollowUpGoal: draft.followUps,
      });
      setMessage("Weekly goals saved.");
    } catch {
      setMessage("OfferOS could not save weekly goals.");
    } finally {
      setBusy("");
    }
  }
  async function restartOnboarding() {
    setBusy("onboarding");
    await settings.update({ onboardingStatus: "in_progress", onboardingStep: 1 });
    window.location.assign("/");
  }
  async function exportData() {
    setBusy("export");
    try {
      const data = await launchRepository.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `offeros-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Account export created.");
    } catch {
      setMessage("OfferOS could not export your data.");
    } finally {
      setBusy("");
    }
  }
  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    setBusy("delete");
    setMessage("");
    try {
      await launchRepository.deleteAccount();
      await user?.delete();
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      setMessage("Account deletion could not be completed. Your account remains active.");
      setBusy("");
    }
  }

  return <div className="space-y-6">
    <Card><CardHeader><div className="flex items-center gap-3"><Gauge className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Weekly goals</h2><p className="mt-1 text-sm text-slate-500">Set practical targets used by the Today dashboard.</p></div></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Applications", "applications"], ["Coding problems", "coding"], ["Mock interviews", "interviews"], ["Follow-ups", "followUps"]].map(([label, key]) => <label key={key}><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span><input className="h-10 w-full rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 text-sm text-slate-200" min="0" onChange={(event) => setDraft((current) => ({ ...current, [key]: Math.max(0, Number(event.target.value)) }))} type="number" value={draft[key as keyof typeof draft]} /></label>)}</div><div className="mt-4"><Button disabled={busy === "goals"} onClick={() => void saveGoals()} variant="primary">{busy === "goals" ? "Saving..." : "Save goals"}</Button></div></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-3"><Shield className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">AI usage and privacy</h2><p className="mt-1 text-sm text-slate-500">AI feedback can be incomplete or inaccurate. Review outputs before relying on them.</p></div></div></CardHeader><CardContent>{usage?.operations.length ? <div className="space-y-3">{usage.operations.map((item) => <div className="flex items-center justify-between rounded-lg border border-slate-700/35 bg-slate-900/20 px-3 py-2.5 text-sm" key={item.operation}><span className="capitalize text-slate-300">{item.operation.replaceAll("_", " ")}</span><span className="text-slate-500">{item.used} / {item.limit}</span></div>)}<p className="text-xs leading-5 text-slate-500">Limits reset monthly. Failed provider requests are not counted as completed usage.</p></div> : <p className="text-sm leading-6 text-slate-500">Live AI usage is unavailable in local mode. Deterministic local practice is clearly labeled and does not call an AI provider.</p>}</CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><RotateCcw className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Guided setup</h2><p className="mt-1 text-sm text-slate-500">Reopen setup without deleting workspace data.</p></div></div></CardHeader><CardContent><Button disabled={busy === "onboarding"} onClick={() => void restartOnboarding()} variant="secondary"><RotateCcw className="size-4" />Restart onboarding</Button></CardContent></Card>
    </div>
    <Card><CardHeader><div className="flex items-center gap-3"><Download className="size-5 text-indigo-300" /><div><h2 className="text-lg font-semibold text-white">Account data</h2><p className="mt-1 text-sm text-slate-500">Export your user-owned workspace data or permanently delete your account.</p></div></div></CardHeader><CardContent><div className="flex flex-wrap gap-2"><Button disabled={busy === "export"} onClick={() => void exportData()} variant="secondary"><Download className="size-4" />{busy === "export" ? "Exporting..." : "Export JSON"}</Button><Button className="border-rose-400/25 text-rose-200 hover:bg-rose-400/10" onClick={() => setDeleteOpen(true)} variant="ghost"><Trash2 className="size-4" />Delete account</Button></div><p className="mt-3 text-xs leading-5 text-slate-500">Exports exclude provider secrets, authentication tokens, internal prompts, server logs, and temporary upload bytes.</p></CardContent></Card>
    {message ? <div className="rounded-lg border border-slate-700/45 bg-slate-900/30 px-3 py-2 text-sm text-slate-300" role="status">{message}</div> : null}
    {deleteOpen ? <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0d0f18]/85 p-4 backdrop-blur-lg"><section className="w-full max-w-md rounded-xl border border-rose-300/20 bg-[var(--surface)] p-6" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title"><h2 className="text-xl font-semibold text-white" id="delete-account-title">Permanently delete account?</h2><p className="mt-3 text-sm leading-6 text-slate-400">This removes your OfferOS database records, including applications, resumes, analyses, prep, interview sessions, notifications, and settings. This cannot be undone.</p><label className="mt-5 block"><span className="mb-1.5 block text-sm text-slate-300">Type DELETE to confirm</span><input autoFocus className="h-10 w-full rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 text-sm text-slate-200" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} /></label><div className="mt-6 flex justify-end gap-2"><Button disabled={busy === "delete"} onClick={() => { setDeleteOpen(false); setConfirmation(""); }} variant="ghost">Cancel</Button><Button className="border-rose-400/30 bg-rose-400/15 text-rose-100" disabled={confirmation !== "DELETE" || busy === "delete"} onClick={() => void deleteAccount()} variant="secondary">{busy === "delete" ? "Deleting..." : "Delete permanently"}</Button></div></section></div> : null}
  </div>;
}
