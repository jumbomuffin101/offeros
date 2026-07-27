"use client";

import Link from "next/link";
import { BellRing, CalendarClock, Check, Clock3, ExternalLink } from "lucide-react";
import type { ApplicationAttentionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function AttentionItemCard({
  item,
  compact = false,
  busy = false,
  snoozeOpen = false,
  onDismiss,
  onSnoozeOpen,
  onSnooze,
}: {
  item: ApplicationAttentionItem;
  compact?: boolean;
  busy?: boolean;
  snoozeOpen?: boolean;
  onDismiss?: () => void;
  onSnoozeOpen?: () => void;
  onSnooze?: (duration: "tomorrow" | "3_days" | "1_week") => void;
}) {
  const severity = item.priority >= 90 ? "Critical" : item.priority >= 60 ? "High" : "Medium";
  const action = actionLink(item);
  return (
    <article className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase ${severity === "Critical" ? "bg-rose-400/10 text-rose-200" : severity === "High" ? "bg-amber-400/10 text-amber-200" : "bg-indigo-400/10 text-indigo-200"}`}>{severity}</span>
            <span className="text-xs text-slate-500">{item.priority} priority</span>
          </div>
          <div className="mt-2 font-semibold text-white">{item.company}</div>
          <div className="mt-0.5 text-sm text-slate-400">{item.role}</div>
          <div className="mt-3 flex items-start gap-2">
            <BellRing className="mt-0.5 size-4 shrink-0 text-indigo-300" />
            <div><div className="text-sm font-medium text-slate-200">{item.title}</div><p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p></div>
          </div>
          {item.dueAt ? <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="size-3.5" />{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.dueAt))}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 text-xs font-medium text-slate-300 transition hover:text-white" href={`/applications?open=${item.applicationId}`}><ExternalLink className="size-3.5" />Open</Link>
          <Link className="inline-flex h-9 items-center rounded-lg border border-indigo-400/25 bg-indigo-400/10 px-3 text-xs font-medium text-indigo-100 transition hover:bg-indigo-400/15" href={action.href}>{action.label}</Link>
        </div>
      </div>
      {!compact && onDismiss && onSnoozeOpen && onSnooze ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-700/30 pt-3">
          <Button disabled={busy} onClick={onDismiss} variant="ghost"><Check className="size-4" />Dismiss</Button>
          <Button disabled={busy} onClick={onSnoozeOpen} variant="ghost"><Clock3 className="size-4" />Snooze</Button>
          {snoozeOpen ? <>
            <button className="rounded-lg border border-slate-700/45 px-2.5 py-1.5 text-xs text-slate-300" disabled={busy} onClick={() => onSnooze("tomorrow")} type="button">Tomorrow</button>
            <button className="rounded-lg border border-slate-700/45 px-2.5 py-1.5 text-xs text-slate-300" disabled={busy} onClick={() => onSnooze("3_days")} type="button">3 days</button>
            <button className="rounded-lg border border-slate-700/45 px-2.5 py-1.5 text-xs text-slate-300" disabled={busy} onClick={() => onSnooze("1_week")} type="button">1 week</button>
          </> : null}
        </div>
      ) : null}
    </article>
  );
}

function actionLink(item: ApplicationAttentionItem) {
  if (item.category === "gmail_review") {
    return { label: "Review emails", href: "/integrations/gmail" };
  }
  if (item.category === "follow_up_due") {
    return { label: "Draft follow-up", href: `/applications?open=${item.applicationId}&copilot=follow-up` };
  }
  if (item.category === "oa_deadline_soon") return { label: "Open prep", href: "/prep" };
  const action = item.category === "missing_resume" ? "resume"
    : item.category === "missing_job_description" ? "job-description"
      : item.category === "needs_resume_analysis" ? "analysis"
        : item.category === "needs_prep_plan" || item.category === "low_prep_readiness" || item.category === "interview_soon" ? "prep"
          : "overview";
  return { label: item.suggestedAction, href: `/applications?open=${item.applicationId}&action=${action}` };
}
