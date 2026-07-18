"use client";

import { useRef, useState, type ReactNode } from "react";
import { Code2, ExternalLink, Link2, Loader2, Pencil, Plus, Trash2, Unplug, Upload } from "lucide-react";
import { CodingActivityModal } from "@/components/prep/coding-activity-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCodingIntelligence, type ActivityInput, type CodingActivity, type CodingGoal } from "@/hooks/use-coding-intelligence";
import { DataError } from "@/lib/data/errors";

export function CodingIntelligencePanel() {
  const coding = useCodingIntelligence();
  const [username, setUsername] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<CodingActivity | null | undefined>(undefined);
  const [goal, setGoal] = useState<CodingGoal | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const currentGoal = goal ?? coding.summary.goal ?? { targetProblems: 5, targetMinutes: 180, difficultyTarget: "" };

  async function connect() {
    const normalized = username.trim().replace(/^@/, "");
    if (process.env.NODE_ENV === "development") { console.debug("[LeetCodeConnect] click"); console.debug("[LeetCodeConnect] handler entered"); }
    setConnectionError(""); setNotice("");
    if (!normalized) { setConnectionError("Enter your LeetCode username."); return; }
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(normalized)) { setConnectionError("Use only letters, numbers, underscores, or hyphens."); return; }
    setBusy(true);
    try { const profile = await coding.connect(normalized); setUsername(profile.username); setNotice(`Connected @${profile.username}. Automatic sync is unsupported; log or import practice manually.`); }
    catch (cause) { if (process.env.NODE_ENV === "development") console.error("[LeetCodeConnect] failed", cause); setConnectionError(connectionMessage(cause)); }
    finally { setBusy(false); }
  }

  async function saveActivity(payload: ActivityInput) {
    setBusy(true); setNotice("");
    try { if (editing) await coding.updateActivity(editing.id, payload); else await coding.createActivity(payload); setNotice(editing ? "Coding activity updated." : "Coding activity logged."); }
    finally { setBusy(false); }
  }

  async function removeActivity(activity: CodingActivity) {
    if (!window.confirm(`Delete ${activity.problemTitle} from your coding history?`)) return;
    setBusy(true); setNotice("");
    try { await coding.deleteActivity(activity.id); setNotice("Coding activity deleted."); }
    catch (cause) { setNotice(connectionMessage(cause)); }
    finally { setBusy(false); }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setNotice("");
    try { const parsed = parseActivitiesCsv(await file.text()); if (!parsed.rows.length) throw new Error(parsed.failures.join(" ") || "No valid activity rows were found."); const result = await coding.importActivities(parsed.rows); const failed = result.failed + parsed.failures.length; setNotice(`Imported: ${result.imported}. Skipped duplicates: ${result.skippedDuplicates}. Failed: ${failed}.${parsed.failures.length ? ` ${parsed.failures.slice(0, 3).join(" ")}` : ""}`); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Unable to import coding activity."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function saveGoal() { setBusy(true); setNotice(""); try { await coding.saveGoal(currentGoal); setNotice("Weekly coding goal saved."); } catch (cause) { setNotice(connectionMessage(cause)); } finally { setBusy(false); } }

  if (coding.loading) return <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5 text-sm text-slate-500">Loading coding practice...</div>;
  return <section className="space-y-5">
    <section className="rounded-xl border border-slate-700/35 bg-[#1b1d2b]/80 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="rounded-lg border border-indigo-300/15 bg-indigo-300/[0.08] p-2.5"><Code2 className="size-5 text-indigo-200" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-white">LeetCode profile</h2><Badge tone={coding.profile ? "green" : "slate"}>{coding.profile ? "Connected" : "Not connected"}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-500">Connect a public username only. OfferOS never asks for your LeetCode password, cookies, or session tokens.</p></div></div>{coding.profile ? <div className="flex flex-wrap gap-2"><a aria-disabled={!coding.profile.username} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700/45 px-3 text-sm text-slate-300 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-50" href={coding.profile.username ? `https://leetcode.com/u/${coding.profile.username}/` : undefined} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />View profile</a><Button disabled={busy} onClick={() => void coding.disconnect()} type="button" variant="ghost"><Unplug className="size-4" />Disconnect</Button></div> : null}</div>
      {coding.profile ? <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-sm text-amber-100/90">@{coding.profile.username} is connected. Automatic activity sync is unsupported, so log or import practice manually to keep your dashboard accurate.</div> : <div className="mt-4"><div className="flex flex-col gap-2 sm:flex-row"><Input aria-describedby={connectionError ? "leetcode-connection-error" : undefined} aria-invalid={Boolean(connectionError)} onChange={(event) => { setUsername(event.target.value); setConnectionError(""); }} placeholder="LeetCode username" value={username} /><Button disabled={busy} onClick={() => void connect()} type="button" variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}{busy ? "Connecting..." : "Connect profile"}</Button></div>{connectionError ? <p className="mt-2 text-sm text-rose-300" id="leetcode-connection-error" role="alert">{connectionError}</p> : null}</div>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total solved" value={coding.summary.totalSolved} /><Stat label="This week" value={coding.summary.completedThisWeek} /><Stat label="Practice streak" value={`${coding.summary.currentStreak} days`} /><Stat label="Minutes this week" value={coding.summary.timeSpentThisWeek} /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Coding activity</h3><p className="mt-1 text-sm text-slate-500">Manual logs and CSV imports are your source of truth.</p></div><div className="flex gap-2"><input accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} ref={fileInput} type="file" /><Button disabled={busy} onClick={() => fileInput.current?.click()} type="button" variant="secondary"><Upload className="size-4" />Import CSV</Button><Button disabled={busy} onClick={() => setEditing(null)} type="button" variant="primary"><Plus className="size-4" />Log problem</Button></div></div><p className="mt-3 text-xs text-slate-500">CSV: title, url, difficulty, topics, status, date, time_spent_minutes, notes. Duplicate URL, or title and date, is skipped.</p>
        <div className="mt-5 space-y-2">{coding.activities.length ? coding.activities.map((activity) => <article className="flex flex-col gap-3 rounded-lg border border-slate-700/35 bg-slate-950/20 p-3 sm:flex-row sm:items-center sm:justify-between" key={activity.id}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-100">{activity.problemTitle}</p><Badge tone={difficultyTone(activity.difficulty)}>{activity.difficulty}</Badge><Badge>{activity.status}</Badge></div><div className="mt-2 flex flex-wrap gap-1.5">{activity.topics.map((topic) => <Badge key={topic} tone="cyan">{topic}</Badge>)}</div></div><div className="flex items-center justify-between gap-3 text-xs text-slate-400 sm:justify-end"><span>{formatDate(activity.solvedAt || activity.attemptedAt)}</span><span>{activity.timeSpentMinutes ? `${activity.timeSpentMinutes} min` : "-"}</span><Button aria-label={`Edit ${activity.problemTitle}`} disabled={busy} onClick={() => setEditing(activity)} type="button" variant="ghost"><Pencil className="size-4" /></Button><Button aria-label={`Delete ${activity.problemTitle}`} className="text-rose-200 hover:text-rose-100" disabled={busy} onClick={() => void removeActivity(activity)} type="button" variant="ghost"><Trash2 className="size-4" /></Button></div></article>) : <p className="py-10 text-center text-sm text-slate-500">Log your first coding problem to start tracking real practice.</p>}</div>
        {coding.activities.length < coding.activityTotal ? <div className="mt-4 text-center"><Button disabled={busy} onClick={() => void coding.loadMore()} type="button" variant="secondary">Load more activity</Button></div> : null}
      </section>
      <aside className="space-y-5"><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Difficulty breakdown</h3><div className="mt-4 space-y-3">{["easy", "medium", "hard"].map((level) => <Metric key={level} label={level} total={Math.max(coding.summary.totalSolved, 1)} value={coding.summary.difficultyBreakdown[level] ?? 0} />)}</div></section><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Weekly coding goal</h3><div className="mt-4 grid gap-3"><Field label="Problems"><Input min="1" onChange={(event) => setGoal({ ...currentGoal, targetProblems: Number(event.target.value) || 1 })} type="number" value={currentGoal.targetProblems} /></Field><Field label="Minutes"><Input min="0" onChange={(event) => setGoal({ ...currentGoal, targetMinutes: Number(event.target.value) || 0 })} type="number" value={currentGoal.targetMinutes} /></Field><Button disabled={busy} onClick={() => void saveGoal()} type="button" variant="secondary">Save goal</Button></div><div className="mt-4 space-y-3"><Metric label={`${coding.summary.completedThisWeek} / ${currentGoal.targetProblems} problems`} total={currentGoal.targetProblems} value={coding.summary.completedThisWeek} /><Metric label={`${coding.summary.timeSpentThisWeek} / ${currentGoal.targetMinutes} minutes`} total={Math.max(currentGoal.targetMinutes, 1)} value={coding.summary.timeSpentThisWeek} /></div></section><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Topic coverage</h3><div className="mt-3 flex flex-wrap gap-2">{Object.keys(coding.summary.topicCoverage).length ? Object.entries(coding.summary.topicCoverage).slice(0, 12).map(([topic, count]) => <Badge key={topic} tone="cyan">{topic} {count}</Badge>) : <span className="text-sm text-slate-500">Topics appear after you log practice.</span>}</div></section></aside>
    </div>
    {notice || coding.error ? <p className="rounded-lg border border-indigo-300/15 bg-indigo-300/[0.06] px-3 py-2 text-sm text-indigo-100" role="status">{notice || coding.error}</p> : null}
    {editing !== undefined ? <CodingActivityModal activity={editing} onClose={() => setEditing(undefined)} onSave={saveActivity} /> : null}
  </section>;
}

function Stat({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4"><div className="text-xs font-medium uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>; }
function Metric({ label, value, total }: { label: string; value: number; total: number }) { return <div><div className="mb-1 flex justify-between gap-3 text-xs"><span className="capitalize text-slate-400">{label}</span><span className="text-slate-200">{value}</span></div><Progress tone="cyan" value={Math.min(100, (value / total) * 100)} /></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>{children}</label>; }
function difficultyTone(value: CodingActivity["difficulty"]) { return value === "easy" ? "green" : value === "hard" ? "red" : "amber"; }
function formatDate(value: string) { return value ? new Date(value).toLocaleDateString() : "No date"; }
function connectionMessage(cause: unknown) { if (cause instanceof DataError) { if (cause.code === "UNAUTHORIZED" || cause.code === "FORBIDDEN") return "Your session needs to be refreshed before saving coding data."; if (cause.code === "NETWORK_ERROR") return "OfferOS could not reach your cloud workspace. Try again in a moment."; return cause.message; } return "OfferOS could not complete that coding action. Please try again."; }

function parseActivitiesCsv(content: string): { rows: ActivityInput[]; failures: string[] } { const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()); if (lines.length < 2) throw new Error("The CSV needs a header row and at least one activity."); const headers = csvLine(lines[0]).map((value) => value.trim().toLowerCase()); const required = ["title", "difficulty", "status", "date"]; if (required.some((header) => !headers.includes(header))) throw new Error("CSV requires title, difficulty, status, and date columns."); const read = (values: string[], field: string) => values[headers.indexOf(field)]?.trim() ?? ""; const rows: ActivityInput[] = []; const failures: string[] = []; lines.slice(1).forEach((line, index) => { const values = csvLine(line); const title = read(values, "title"); const difficulty = read(values, "difficulty").toLowerCase(); const status = read(values, "status").toLowerCase(); const date = read(values, "date"); const row = index + 2; if (!title) { failures.push(`Row ${row}: title is required.`); return; } if (!["easy", "medium", "hard"].includes(difficulty)) { failures.push(`Row ${row}: difficulty must be Easy, Medium, or Hard.`); return; } if (!["solved", "attempted", "review"].includes(status)) { failures.push(`Row ${row}: status must be solved, attempted, or review.`); return; } if (Number.isNaN(new Date(date).getTime())) { failures.push(`Row ${row}: date is invalid.`); return; } const minutes = read(values, "time_spent_minutes"); if (minutes && (!Number.isFinite(Number(minutes)) || Number(minutes) < 0)) { failures.push(`Row ${row}: time_spent_minutes must be zero or greater.`); return; } rows.push({ problemTitle: title, problemUrl: headers.includes("url") ? read(values, "url") : "", difficulty: difficulty as ActivityInput["difficulty"], topics: (headers.includes("topics") ? read(values, "topics") : "").split(",").map((topic) => topic.trim()).filter(Boolean), status: status as ActivityInput["status"], solvedAt: date, attemptedAt: "", timeSpentMinutes: Number(minutes) || 0, notes: headers.includes("notes") ? read(values, "notes") : "" }); }); return { rows, failures }; }
function csvLine(line: string) { const values: string[] = []; let value = ""; let quoted = false; for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { values.push(value); value = ""; } else value += char; } values.push(value); return values; }
