"use client";

import { useState } from "react";
import { CalendarPlus, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApplicationEvents } from "@/hooks/use-application-events";
import type { Application, ApplicationEvent, ApplicationEventType } from "@/lib/types";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";

const presets: Array<{ type: ApplicationEventType; label: string }> = [
  { type: "oa_deadline", label: "OA deadline" }, { type: "recruiter_screen", label: "Recruiter screen" },
  { type: "technical_interview", label: "Technical interview" }, { type: "behavioral_interview", label: "Behavioral interview" },
  { type: "system_design_interview", label: "System design" }, { type: "final_round", label: "Final round" },
  { type: "offer_deadline", label: "Offer deadline" }, { type: "follow_up", label: "Follow up" },
];

export function ApplicationTimeline({ application, onChanged }: { application: Application; onChanged: () => void }) {
  const timeline = useApplicationEvents(application.id);
  const [editing, setEditing] = useState<ApplicationEvent | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number] | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function complete(event: ApplicationEvent) { setBusy(event.id); try { await timeline.update(event.id, { status: "completed" }); onChanged(); } finally { setBusy(""); } }
  async function remove(event: ApplicationEvent) { setBusy(event.id); try { await timeline.delete(event.id); onChanged(); } finally { setBusy(""); } }
  async function calendar(event: ApplicationEvent) { setBusy(event.id); setMessage(""); try { await timeline.addToCalendar(event.id); setMessage(event.externalCalendarEventId ? "Calendar event updated." : "Added to Google Calendar."); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to sync this event."); } finally { setBusy(""); } }

  return <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Timeline</h3><p className="mt-1 text-xs text-slate-500">Interviews, assessments, deadlines, and follow-ups.</p></div><Button onClick={() => setPreset({ type: "custom", label: "Custom event" })} variant="secondary"><Plus className="size-4" />Add event</Button></div>
    <div className="mt-4 flex flex-wrap gap-2">{presets.map((item) => <button className="rounded-lg border border-slate-700/45 bg-slate-900/40 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-100" key={item.type} onClick={() => setPreset(item)} type="button">+ {item.label}</button>)}</div>
    {timeline.error ? <p className="mt-3 text-sm text-rose-200">{timeline.error}</p> : null}{message ? <p className="mt-3 text-sm text-indigo-200">{message}</p> : null}
    <div className="mt-5 space-y-3">{timeline.loading ? <p className="text-sm text-slate-500">Loading timeline...</p> : timeline.events.length ? timeline.events.map((event) => <article className={`rounded-lg border p-3 ${event.status === "completed" ? "border-emerald-400/15 bg-emerald-400/[0.04]" : event.status === "canceled" ? "border-slate-700/30 opacity-60" : reminderClass(event.scheduledAt)}`} key={event.id}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-white">{event.title}</span><Badge tone={event.status === "completed" ? "green" : event.status === "canceled" ? "slate" : "purple"}>{event.status}</Badge>{event.externalCalendarEventId ? <Badge tone="cyan">Calendar synced</Badge> : null}</div><div className="mt-1 text-xs text-slate-400">{formatEventDate(event.scheduledAt)} · {labelType(event.eventType)}</div>{event.description ? <p className="mt-2 text-sm leading-5 text-slate-400">{event.description}</p> : null}</div><div className="flex shrink-0 gap-1"><button aria-label="Edit event" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" onClick={() => setEditing(event)}><Pencil className="size-3.5" /></button>{event.status === "upcoming" ? <button aria-label="Mark event complete" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-emerald-200" disabled={busy === event.id} onClick={() => void complete(event)}><Check className="size-3.5" /></button> : null}<button aria-label="Delete event" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-200" disabled={busy === event.id} onClick={() => void remove(event)}><Trash2 className="size-3.5" /></button></div></div>{event.status === "upcoming" ? <Button className="mt-3" disabled={busy === event.id || dataMode !== "api"} onClick={() => void calendar(event)} variant="ghost"><CalendarPlus className="size-4" />{event.externalCalendarEventId ? "Update calendar event" : "Add to calendar"}</Button> : null}</article>) : <div className="rounded-lg border border-dashed border-slate-700/40 px-4 py-8 text-center text-sm text-slate-500">No timeline events yet.</div>}</div>
    {preset || editing ? <EventEditor application={application} event={editing} preset={preset} onClose={() => { setPreset(null); setEditing(null); }} onSave={async (values) => { if (editing) await timeline.update(editing.id, values); else await timeline.create(values); setPreset(null); setEditing(null); onChanged(); }} /> : null}
  </section>;
}

function EventEditor({ application, event, preset, onClose, onSave }: { application: Application; event: ApplicationEvent | null; preset: { type: ApplicationEventType; label: string } | null; onClose: () => void; onSave: (value: Omit<ApplicationEvent, "id" | "applicationId" | "completedAt" | "externalCalendarEventId" | "createdAt" | "updatedAt">) => Promise<void> }) {
  const type = event?.eventType ?? preset?.type ?? "custom"; const label = preset?.label ?? labelType(type);
  const [title, setTitle] = useState(event?.title ?? `${application.company} ${application.role} - ${label}`);
  const [scheduledAt, setScheduledAt] = useState(event ? toLocalInput(event.scheduledAt) : ""); const [description, setDescription] = useState(event?.description ?? ""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit() { if (!title.trim()) { setError("Add an event title."); return; } if (!scheduledAt) { setError("Choose a date and time."); return; } setSaving(true); try { await onSave({ eventType: type, title: title.trim(), description: description.trim(), scheduledAt: new Date(scheduledAt).toISOString(), status: event?.status ?? "upcoming", source: event?.source ?? "manual" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the event."); } finally { setSaving(false); } }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-xl border border-slate-700/50 bg-[#1b1d2b] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-white">{event ? "Edit event" : `Add ${label.toLowerCase()}`}</h3><button aria-label="Close event form" onClick={onClose}><X className="size-4 text-slate-400" /></button></div>{error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}<div className="mt-4 space-y-3"><label className="block text-xs text-slate-500">Title<input className="mt-1 h-10 w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 text-sm text-white" onChange={(e) => setTitle(e.target.value)} value={title} /></label><label className="block text-xs text-slate-500">Date and time<input className="mt-1 h-10 w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 text-sm text-white" onChange={(e) => setScheduledAt(e.target.value)} type="datetime-local" value={scheduledAt} /></label><label className="block text-xs text-slate-500">Description<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-700/60 bg-slate-950/50 p-3 text-sm text-white" onChange={(e) => setDescription(e.target.value)} value={description} /></label></div><div className="mt-5 flex justify-end gap-2"><Button disabled={saving} onClick={onClose} variant="ghost">Cancel</Button><Button disabled={saving} onClick={() => void submit()} variant="primary">{saving ? "Saving..." : "Save event"}</Button></div></div></div>;
}
function labelType(value: string) { return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); }
function formatEventDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function toLocalInput(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function reminderClass(value: string) { const hours = (new Date(value).getTime() - Date.now()) / 3_600_000; if (hours < 0) return "border-rose-400/25 bg-rose-400/[0.06]"; if (hours <= 24) return "border-amber-400/25 bg-amber-400/[0.06]"; if (hours <= 72) return "border-indigo-400/20 bg-indigo-400/[0.04]"; return "border-slate-700/35 bg-slate-950/20"; }
