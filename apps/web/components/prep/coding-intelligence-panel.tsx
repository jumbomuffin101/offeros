"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Code2, ExternalLink, Link2, Loader2, Plus, Unplug, Upload } from "lucide-react";
import { DataError } from "@/lib/data/errors";
import { useCodingIntelligence, type ActivityInput, type CodingGoal } from "@/hooks/use-coding-intelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const emptyActivity: ActivityInput = { problemTitle: "", problemUrl: "", difficulty: "medium", topics: [], status: "solved", solvedAt: new Date().toISOString().slice(0, 10), attemptedAt: "", timeSpentMinutes: 30, notes: "" };

export function CodingIntelligencePanel() {
  const coding = useCodingIntelligence();
  const [username, setUsername] = useState("");
  const [form, setForm] = useState<ActivityInput>(emptyActivity);
  const [topics, setTopics] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [goal, setGoal] = useState<CodingGoal | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function connect() {
    const normalized = username.trim().replace(/^@/, "");
    if (process.env.NODE_ENV === "development") { console.debug("[LeetCodeConnect] click"); console.debug("[LeetCodeConnect] handler entered"); }
    setConnectionError(""); setNotice("");
    if (!normalized) { setConnectionError("Enter your LeetCode username."); return; }
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(normalized)) { setConnectionError("Use only letters, numbers, underscores, or hyphens."); return; }
    if (process.env.NODE_ENV === "development") { console.debug("[LeetCodeConnect] username", normalized); console.debug("[LeetCodeConnect] validation passed"); console.debug("[LeetCodeConnect] repository called"); }
    setBusy(true);
    try {
      const profile = await coding.connect(normalized);
      setUsername(profile.username);
      setNotice(`Connected @${profile.username}. Automatic sync is unavailable; log or import practice manually.`);
    } catch (cause) {
      if (process.env.NODE_ENV === "development") console.error("[LeetCodeConnect] failed", cause);
      setConnectionError(connectionMessage(cause));
    } finally { setBusy(false); }
  }
  async function logActivity() { setBusy(true); setNotice(""); try { await coding.createActivity({ ...form, topics: topics.split(",").map((topic) => topic.trim()).filter(Boolean) }); setForm(emptyActivity); setTopics(""); setOpen(false); setNotice("Coding activity logged."); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Unable to log activity."); } finally { setBusy(false); } }
  async function saveGoal() { if (!goal) return; setBusy(true); try { await coding.saveGoal(goal); setNotice("Weekly coding goal saved."); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Unable to save goal."); } finally { setBusy(false); } }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file with coding activity rows.");
      const rows = parseActivitiesCsv(await file.text());
      const result = await coding.importActivities(rows);
      setNotice(`Imported ${result.imported} activities${result.skippedDuplicates ? `; skipped ${result.skippedDuplicates} duplicates` : ""}.`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Unable to import coding activity."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  const currentGoal = goal ?? coding.summary.goal ?? { targetProblems: 5, targetMinutes: 180, difficultyTarget: "" };
  if (coding.loading) return <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5 text-sm text-slate-500">Loading coding practice...</div>;

  return <section className="space-y-5">
    <div className="rounded-xl border border-slate-700/35 bg-[#1b1d2b]/80 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="rounded-lg border border-indigo-300/15 bg-indigo-300/[0.08] p-2.5"><Code2 className="size-5 text-indigo-200" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-white">LeetCode profile</h2>{coding.profile ? <Badge tone="green">Connected</Badge> : <Badge tone="slate">Not connected</Badge>}</div><p className="mt-1 text-sm leading-6 text-slate-500">Connect a public username only. OfferOS never asks for your LeetCode password, cookies, or session tokens.</p></div></div>{coding.profile ? <div className="flex flex-wrap gap-2"><a className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700/45 px-3 text-sm text-slate-300 hover:text-white" href={coding.profile.profileUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />View profile</a><Button disabled={busy} onClick={() => void coding.disconnect()} type="button" variant="ghost"><Unplug className="size-4" />Disconnect</Button></div> : null}</div>
      {coding.profile ? <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-sm text-amber-100/90">@{coding.profile.username} is connected. Automatic activity sync is unsupported, so log or import practice manually to keep your dashboard accurate.</div> : <div className="mt-4"><div className="flex flex-col gap-2 sm:flex-row"><Input aria-describedby={connectionError ? "leetcode-connection-error" : undefined} aria-invalid={Boolean(connectionError)} onChange={(event) => { setUsername(event.target.value); if (connectionError) setConnectionError(""); }} placeholder="LeetCode username" value={username} /><Button disabled={busy} onClick={() => void connect()} type="button" variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}{busy ? "Connecting..." : "Connect profile"}</Button></div>{connectionError ? <p className="mt-2 text-sm text-rose-300" id="leetcode-connection-error" role="alert">{connectionError}</p> : null}</div>}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total solved" value={coding.summary.totalSolved} /><Stat label="This week" value={coding.summary.completedThisWeek} /><Stat label="Practice streak" value={`${coding.summary.currentStreak} days`} /><Stat label="Minutes this week" value={coding.summary.timeSpentThisWeek} /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Coding activity</h3><p className="mt-1 text-sm text-slate-500">Manual practice history is the source of truth.</p></div><div className="flex flex-wrap gap-2"><input accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} ref={fileInput} type="file" /><Button disabled={busy} onClick={() => fileInput.current?.click()} variant="secondary"><Upload className="size-4" />Import CSV</Button><Button disabled={busy} onClick={() => setOpen((value) => !value)} variant="primary"><Plus className="size-4" />Log problem</Button></div></div>
        <p className="mt-3 text-xs text-slate-500">CSV columns: title, url, difficulty, topics, status, date, time_spent_minutes, notes. Imports are deduplicated by problem and date.</p>
        {open ? <div className="mt-5 grid gap-3 border-t border-slate-700/35 pt-5 sm:grid-cols-2"><Field label="Problem title"><Input onChange={(event) => setForm({ ...form, problemTitle: event.target.value })} value={form.problemTitle} /></Field><Field label="Problem URL"><Input onChange={(event) => setForm({ ...form, problemUrl: event.target.value })} value={form.problemUrl} /></Field><Field label="Difficulty"><Select value={form.difficulty} onChange={(value) => setForm({ ...form, difficulty: value as ActivityInput["difficulty"] })} options={["easy", "medium", "hard"]} /></Field><Field label="Status"><Select value={form.status} onChange={(value) => setForm({ ...form, status: value as ActivityInput["status"] })} options={["solved", "attempted", "review"]} /></Field><Field label="Topics"><Input onChange={(event) => setTopics(event.target.value)} placeholder="arrays, graphs, hash maps" value={topics} /></Field><Field label="Time spent (minutes)"><Input min="1" onChange={(event) => setForm({ ...form, timeSpentMinutes: Number(event.target.value) || 0 })} type="number" value={form.timeSpentMinutes || ""} /></Field><Field label="Date" className="sm:col-span-2"><Input onChange={(event) => setForm({ ...form, solvedAt: event.target.value })} type="date" value={form.solvedAt} /></Field><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-slate-500">Notes</span><textarea className="min-h-20 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-2 text-sm text-slate-100" onChange={(event) => setForm({ ...form, notes: event.target.value })} value={form.notes} /></label><div className="sm:col-span-2"><Button disabled={busy || !form.problemTitle.trim()} onClick={() => void logActivity()} variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Save activity</Button></div></div> : null}
        <div className="mt-5 space-y-2">{coding.activities.length ? coding.activities.map((activity) => <div className="flex flex-col gap-2 rounded-lg border border-slate-700/35 bg-slate-950/20 p-3 sm:flex-row sm:items-center sm:justify-between" key={activity.id}><div><div className="font-medium text-slate-100">{activity.problemTitle}</div><div className="mt-1 flex flex-wrap gap-1.5">{activity.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)}</div></div><div className="text-right text-xs text-slate-500"><div className="capitalize text-slate-300">{activity.difficulty} - {activity.status}</div><div className="mt-1">{activity.solvedAt ? new Date(activity.solvedAt).toLocaleDateString() : "Not dated"}</div></div></div>) : <p className="py-8 text-center text-sm text-slate-500">Log a coding problem to start tracking practice.</p>}</div>
      </div>
      <aside className="space-y-5"><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Difficulty breakdown</h3><div className="mt-4 space-y-3">{["easy", "medium", "hard"].map((level) => <Metric key={level} label={level} value={coding.summary.difficultyBreakdown[level] ?? 0} total={Math.max(coding.summary.totalSolved, 1)} />)}</div></section><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Weekly coding goal</h3><div className="mt-4 grid gap-3"><Field label="Problems"><Input min="1" onChange={(event) => setGoal({ ...currentGoal, targetProblems: Number(event.target.value) || 1 })} type="number" value={currentGoal.targetProblems} /></Field><Field label="Minutes"><Input min="0" onChange={(event) => setGoal({ ...currentGoal, targetMinutes: Number(event.target.value) || 0 })} type="number" value={currentGoal.targetMinutes} /></Field><Button disabled={busy} onClick={() => void saveGoal()} variant="secondary">Save goal</Button></div><div className="mt-4"><Metric label="Problems this week" value={coding.summary.completedThisWeek} total={currentGoal.targetProblems} /></div></section><section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-5"><h3 className="font-semibold text-white">Topic coverage</h3><div className="mt-3 flex flex-wrap gap-2">{Object.keys(coding.summary.topicCoverage).length ? Object.entries(coding.summary.topicCoverage).slice(0, 12).map(([topic, count]) => <Badge key={topic} tone="cyan">{topic} {count}</Badge>) : <span className="text-sm text-slate-500">Topics appear after you log practice.</span>}</div></section></aside>
    </div>
    {notice || coding.error ? <div className="rounded-lg border border-indigo-300/15 bg-indigo-300/[0.06] px-3 py-2 text-sm text-indigo-100">{notice || coding.error}</div> : null}
  </section>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4"><div className="text-xs font-medium uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>; }
function Metric({ label, value, total }: { label: string; value: number; total: number }) { return <div><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-slate-400">{label}</span><span className="text-slate-200">{value}</span></div><Progress value={(value / total) * 100} tone="cyan" /></div>; }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={className}><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>{children}</label>; }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 text-sm text-slate-100" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }

function connectionMessage(cause: unknown) {
  if (cause instanceof DataError) {
    if (cause.code === "UNAUTHORIZED" || cause.code === "FORBIDDEN") return "Your session needs to be refreshed before connecting a profile.";
    if (cause.code === "NETWORK_ERROR") return "OfferOS could not reach your cloud workspace. Try again in a moment.";
    return cause.message;
  }
  return "OfferOS could not connect this profile. Please try again.";
}

function parseActivitiesCsv(content: string): ActivityInput[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV needs a header row and at least one activity.");
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const titleIndex = headers.findIndex((header) => header === "title" || header === "problem_title" || header === "problem");
  if (titleIndex < 0) throw new Error("The CSV needs a title or problem_title column.");
  const valueAt = (values: string[], names: string[]) => { const index = headers.findIndex((header) => names.includes(header)); return index >= 0 ? values[index]?.trim() ?? "" : ""; };
  const rows: ActivityInput[] = [];
  for (const [index, line] of lines.slice(1).entries()) {
    const values = parseCsvLine(line); const title = values[titleIndex]?.trim();
    if (!title) continue;
    const difficulty = valueAt(values, ["difficulty"]).toLowerCase(); const status = valueAt(values, ["status"]).toLowerCase();
    const date = valueAt(values, ["date", "solved_at", "attempted_at"]);
    if (date && Number.isNaN(new Date(date).getTime())) throw new Error(`Row ${index + 2} has an invalid date.`);
    rows.push({ problemTitle: title, problemUrl: valueAt(values, ["url", "problem_url"]), difficulty: difficulty === "easy" || difficulty === "hard" ? difficulty : "medium", topics: valueAt(values, ["topics", "topic"]).split(/[|,]/).map((topic) => topic.trim()).filter(Boolean), status: status === "attempted" || status === "review" ? status : "solved", solvedAt: date || new Date().toISOString().slice(0, 10), attemptedAt: "", timeSpentMinutes: Number(valueAt(values, ["time_spent_minutes", "minutes", "time"])) || 0, notes: valueAt(values, ["notes"]) });
  }
  if (!rows.length) throw new Error("No valid activity rows were found in this CSV.");
  return rows;
}

function parseCsvLine(line: string): string[] { const values: string[] = []; let value = ""; let quoted = false; for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; } else if (character === '"') quoted = !quoted; else if (character === "," && !quoted) { values.push(value); value = ""; } else value += character; } values.push(value); return values; }
