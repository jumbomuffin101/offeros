"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, Inbox, Loader2, Mail, RefreshCw, ShieldCheck, Trash2, Unplug, X } from "lucide-react";
import { useGmail } from "@/hooks/use-gmail";
import { useApplications } from "@/hooks/use-applications";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { ApplicationEventType, ApplicationStatus, GmailSuggestion } from "@/lib/types";

const eventOptions: Array<{ value: ApplicationEventType; label: string }> = [
  { value: "applied", label: "Application confirmed" }, { value: "oa_received", label: "OA received" },
  { value: "oa_deadline", label: "OA deadline" }, { value: "recruiter_screen", label: "Recruiter screen" },
  { value: "technical_interview", label: "Technical interview" }, { value: "final_round", label: "Final round" },
  { value: "offer_received", label: "Offer received" }, { value: "rejected", label: "Rejection" }, { value: "follow_up", label: "Follow-up" },
];
const statusMap: Record<string, ApplicationStatus> = { applied: "Applied", oa: "OA", interview: "Interview", final_round: "Final Round", offer: "Offer", rejected: "Rejected" };

export function GmailWorkspace() {
  const gmail = useGmail();
  const { applications } = useApplications();
  const [tab, setTab] = useState<"pending" | "accepted" | "rejected">("pending");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const staleSyncAttempted = useRef(false);
  const suggestions = useMemo(() => gmail.suggestions.filter((item) => item.status === tab), [gmail.suggestions, tab]);
  const refreshGmail = gmail.refresh;
  const syncGmail = gmail.sync;

  useEffect(() => {
    const callbackStatus = new URLSearchParams(window.location.search).get("gmail");
    if (callbackStatus === "connected") {
      window.queueMicrotask(() => setToast("Gmail connected. Run the initial recruiting email scan."));
      void refreshGmail();
    } else if (callbackStatus === "error") {
      window.queueMicrotask(() => setToast("Gmail connection was not completed. Review access and try again."));
    }
  }, [refreshGmail]);

  useEffect(() => {
    if (!gmail.status?.connected || staleSyncAttempted.current) return;
    const lastSync = gmail.status.lastSyncedAt ? new Date(gmail.status.lastSyncedAt).getTime() : 0;
    if (lastSync > Date.now() - 15 * 60_000) return;
    staleSyncAttempted.current = true;
    void syncGmail().catch((error) => {
      setToast(error instanceof Error ? error.message : "Gmail sync failed.");
    });
  }, [gmail.status?.connected, gmail.status?.lastSyncedAt, syncGmail]);

  async function connect() {
    setBusy("connect");
    try {
      const result = await gmail.connect();
      if (result.authorizationUrl) window.location.assign(result.authorizationUrl);
      else setToast("Simulated Gmail workspace connected. No Google account was accessed.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Unable to connect Gmail."); }
    finally { setBusy(""); }
  }
  async function sync() {
    setBusy("sync");
    try { const result = await gmail.sync(); setToast(`${result.suggestionsCreated} recruiting suggestion${result.suggestionsCreated === 1 ? "" : "s"} ready for review.`); }
    catch (error) { setToast(error instanceof Error ? error.message : "Gmail sync failed."); }
    finally { setBusy(""); }
  }
  async function reject(id: string) {
    setBusy(id);
    try { await gmail.reject(id); setToast("Suggestion rejected. No application data was changed."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Unable to reject suggestion."); }
    finally { setBusy(""); }
  }
  async function disconnect(deleteDerivedData: boolean) {
    setBusy("disconnect");
    try { await gmail.disconnect(deleteDerivedData); setDisconnectOpen(false); setToast("Gmail disconnected. Confirmed application timeline events were kept."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Unable to disconnect Gmail."); }
    finally { setBusy(""); }
  }
  async function deleteDerivedData() {
    if (deleteConfirmation !== "DELETE GMAIL DATA") return;
    setBusy("delete");
    try {
      await gmail.deleteDerivedData();
      setDeleteOpen(false);
      setDeleteConfirmation("");
      setToast("Gmail-derived review data deleted. Confirmed application timeline events were kept.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Unable to delete Gmail-derived data."); }
    finally { setBusy(""); }
  }

  if (gmail.loading) return <div className="flex min-h-64 items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 size-4 animate-spin" />Loading Gmail integration...</div>;
  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-700/45 bg-[#1b1d2b] p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3"><div className="rounded-lg bg-indigo-400/10 p-2.5 text-indigo-300"><Mail className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-white">Gmail-assisted tracking</h2><span className={`rounded-full border px-2 py-0.5 text-xs ${gmail.status?.connected ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-slate-600/50 text-slate-400"}`}>{gmail.status?.simulated ? "Local simulation" : gmail.status?.connected ? "Connected" : "Not connected"}</span></div><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">OfferOS reads bounded recruiting email metadata using Gmail read-only access. It never sends, modifies, labels, deletes, or marks email read.</p>{gmail.status?.gmailAddress ? <p className="mt-2 text-sm text-slate-200">{gmail.status.gmailAddress}</p> : null}</div></div>
        <div className="flex shrink-0 flex-wrap gap-2">{gmail.status?.connected ? <><Button disabled={!!busy} onClick={() => void sync()}><RefreshCw className={`size-4 ${busy === "sync" ? "animate-spin" : ""}`} />{busy === "sync" ? "Syncing..." : "Sync now"}</Button><Button disabled={!!busy} onClick={() => setDeleteOpen(true)} variant="ghost"><Trash2 className="size-4" />Delete data</Button><Button disabled={!!busy} onClick={() => setDisconnectOpen(true)} variant="ghost"><Unplug className="size-4" />Disconnect</Button></> : <Button disabled={busy === "connect" || gmail.status?.enabled === false} onClick={() => void connect()} variant="primary">{busy === "connect" ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}{busy === "connect" ? "Connecting..." : "Connect Gmail"}</Button>}</div>
      </div>
      {gmail.status?.enabled === false ? <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">Gmail integration is not configured on this OfferOS environment.</p> : null}
      {gmail.status?.status === "needs_reauthorization" ? <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">Gmail access needs reauthorization. Reconnect before syncing.</p> : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-700/40 pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Scope: read-only</span><span>Last synced: {gmail.status?.lastSyncedAt ? new Date(gmail.status.lastSyncedAt).toLocaleString() : "Never"}</span><span>Recent scan: bounded to configured history</span></div>
    </section>

    <section className="rounded-xl border border-slate-700/45 bg-[#1b1d2b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 px-5 py-4"><div><h2 className="font-semibold text-white">Recruiting email review</h2><p className="mt-1 text-sm text-slate-500">Nothing changes until you accept a suggestion.</p></div><div className="flex rounded-lg border border-slate-700/50 bg-slate-950/30 p-1">{(["pending", "accepted", "rejected"] as const).map((value) => <button className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === value ? "bg-slate-700/70 text-white" : "text-slate-400"}`} key={value} onClick={() => setTab(value)} type="button">{value} {gmail.suggestions.filter((item) => item.status === value).length}</button>)}</div></div>
      <div className="space-y-3 p-4">{suggestions.length ? suggestions.map((item) => <SuggestionCard applications={applications} busy={busy === item.id} editing={editing === item.id} item={item} key={item.id} onAccept={async (input) => { setBusy(item.id); try { await gmail.accept(item.id, input); setEditing(null); setToast("Timeline event added. Status changed only if you selected it."); } catch (error) { setToast(error instanceof Error ? error.message : "Unable to accept suggestion."); } finally { setBusy(""); } }} onEdit={() => setEditing(editing === item.id ? null : item.id)} onReject={() => void reject(item.id)} />) : <div className="py-14 text-center"><Inbox className="mx-auto size-6 text-slate-500" /><h3 className="mt-3 font-medium text-slate-200">No {tab} suggestions</h3><p className="mt-1 text-sm text-slate-500">{tab === "pending" ? "Sync Gmail to check recent candidate recruiting messages." : "Reviewed suggestions will appear here."}</p></div>}</div>
    </section>

    {disconnectOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"><div aria-modal="true" className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#202336] p-5" role="dialog"><h2 className="text-lg font-semibold text-white">Disconnect Gmail?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Google access will be revoked and the encrypted refresh token removed. Confirmed application timeline events remain.</p><div className="mt-5 grid gap-2"><Button disabled={!!busy} onClick={() => void disconnect(false)}>Disconnect and keep review history</Button><Button disabled={!!busy} onClick={() => void disconnect(true)} variant="secondary">Disconnect and delete unconfirmed Gmail data</Button><Button disabled={!!busy} onClick={() => setDisconnectOpen(false)} variant="ghost">Cancel</Button></div></div></div> : null}
    {deleteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"><div aria-labelledby="gmail-delete-title" aria-modal="true" className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#202336] p-5" role="dialog"><h2 className="text-lg font-semibold text-white" id="gmail-delete-title">Delete Gmail-derived data?</h2><p className="mt-2 text-sm leading-6 text-slate-400">This deletes unconfirmed suggestions, cached message metadata, excerpts, sync cursors, and diagnostics. User-approved application timeline events remain.</p><label className="mt-4 block text-xs font-medium text-slate-400">Type DELETE GMAIL DATA to confirm<input autoFocus className="mt-2 h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white outline-none focus:border-indigo-400" onChange={(event) => setDeleteConfirmation(event.target.value)} value={deleteConfirmation} /></label><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={!!busy} onClick={() => { setDeleteOpen(false); setDeleteConfirmation(""); }} variant="ghost">Cancel</Button><Button className="border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25" disabled={!!busy || deleteConfirmation !== "DELETE GMAIL DATA"} onClick={() => void deleteDerivedData()}>{busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete Gmail-derived data</Button></div></div></div> : null}
    <Toast message={toast} tone={toast.toLowerCase().includes("unable") || toast.toLowerCase().includes("failed") || toast.toLowerCase().includes("not completed") ? "info" : "success"} />
  </div>;
}

function SuggestionCard({ item, applications, editing, busy, onEdit, onReject, onAccept }: { item: GmailSuggestion; applications: ReturnType<typeof useApplications>["applications"]; editing: boolean; busy: boolean; onEdit: () => void; onReject: () => void; onAccept: (input: Parameters<ReturnType<typeof useGmail>["accept"]>[1]) => Promise<void> }) {
  const [applicationId, setApplicationId] = useState(item.applicationId ?? applications[0]?.id ?? "");
  const [eventType, setEventType] = useState<ApplicationEventType>(item.suggestedEventType ?? "follow_up");
  const [eventAt, setEventAt] = useState(toLocalInput(item.suggestedEventAt ?? item.message.receivedAt));
  const [deadlineAt, setDeadlineAt] = useState(item.suggestedDeadlineAt ? toLocalInput(item.suggestedDeadlineAt) : "");
  const [applyStatus, setApplyStatus] = useState(false);
  const [note, setNote] = useState("");
  const proposedStatus = statusMap[item.suggestedStatus?.toLowerCase() ?? ""];
  return <article className="rounded-lg border border-slate-700/50 bg-slate-900/25 p-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-xs text-indigo-200">{item.emailType.replaceAll("_", " ")}</span><span className="text-xs text-slate-500">{Math.round(item.confidence * 100)}% confidence</span></div><h3 className="mt-2 truncate font-medium text-white">{item.message.subject}</h3><p className="mt-1 text-sm text-slate-400">{item.message.senderName || item.message.senderEmail} · {new Date(item.message.receivedAt).toLocaleString()}</p></div><div className="flex gap-2">{item.status === "pending" ? <><Button disabled={busy} onClick={onEdit} variant="secondary"><ChevronDown className="size-4" />Review</Button><Button disabled={busy} onClick={onReject} variant="ghost"><X className="size-4" />Reject</Button></> : <span className="flex items-center gap-1 text-sm text-slate-400">{item.status === "accepted" ? <Check className="size-4 text-emerald-300" /> : <X className="size-4" />}{item.status}</span>}</div></div>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-slate-400">Show limited email excerpt</summary><p className="mt-2 rounded-lg bg-slate-950/35 p-3 leading-6 text-slate-300">{item.message.excerpt || item.message.snippet || "No excerpt stored."}</p></details>
    <div className="mt-3 flex flex-wrap gap-2">{item.evidence.map((value) => <span className="rounded-md bg-slate-800/70 px-2 py-1 text-xs text-slate-300" key={value}>{value}</span>)}</div>
    {editing ? <div className="mt-4 grid gap-3 border-t border-slate-700/40 pt-4 sm:grid-cols-2"><label className="text-xs text-slate-400">Matched application<select className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setApplicationId(event.target.value)} value={applicationId}>{applications.map((app) => <option key={app.id} value={app.id}>{app.company} - {app.role}</option>)}</select></label><label className="text-xs text-slate-400">Timeline event<select className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setEventType(event.target.value as ApplicationEventType)} value={eventType}>{eventOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-xs text-slate-400">Event date/time<input className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setEventAt(event.target.value)} type="datetime-local" value={eventAt} /></label><label className="text-xs text-slate-400">Confirmed deadline (optional)<input className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setDeadlineAt(event.target.value)} type="datetime-local" value={deadlineAt} /></label><label className="text-xs text-slate-400 sm:col-span-2">Note<input className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setNote(event.target.value)} value={note} /></label>{proposedStatus ? <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input checked={applyStatus} className="size-4 accent-indigo-500" onChange={(event) => setApplyStatus(event.target.checked)} type="checkbox" />Also change application status to {proposedStatus}</label> : null}<div className="flex justify-end sm:col-span-2"><Button disabled={busy || !applicationId || !eventAt} onClick={() => void onAccept({ applicationId, eventType, eventAt: new Date(eventAt).toISOString(), deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : undefined, proposedStatus, applyStatus, recruiterName: item.recruiterName, note })} variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Accept suggestion</Button></div></div> : null}
  </article>;
}
function toLocalInput(value: string) { const date = new Date(value); const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return shifted.toISOString().slice(0, 16); }
