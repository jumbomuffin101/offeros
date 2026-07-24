"use client";

import { useState } from "react";
import { Inbox, Loader2 } from "lucide-react";
import { AttentionItemCard } from "@/components/inbox/attention-item-card";
import { DataErrorState } from "@/components/ui/data-error-state";
import { useInbox } from "@/hooks/use-inbox";

export function InboxWorkspace() {
  const { inbox, loading, error, refresh, dismiss, snooze } = useInbox();
  const [busyId, setBusyId] = useState("");
  const [snoozeId, setSnoozeId] = useState("");

  async function run(id: string, operation: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await operation();
      setSnoozeId("");
    } finally {
      setBusyId("");
    }
  }

  if (error && !inbox) return <DataErrorState error={error} onRetry={() => void refresh()} />;
  if (loading && !inbox) return <div className="flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/20 p-6 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" />Prioritizing your recruiting actions...</div>;
  if (!inbox?.items.length) return <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><Inbox className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">Inbox clear</h2><p className="mt-2 text-sm text-slate-500">No application needs immediate attention. New deadlines and follow-ups will appear here.</p></div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total", inbox.summary.total],
          ["Critical", inbox.summary.critical],
          ["High", inbox.summary.high],
          ["Medium", inbox.summary.medium],
        ].map(([label, value]) => <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-4" key={label}><div className="text-xs uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>)}
      </div>
      <div className="space-y-3">
        {inbox.items.map((item) => (
          <AttentionItemCard
            busy={busyId === item.id}
            item={item}
            key={item.id}
            onDismiss={() => void run(item.id, () => dismiss(item.applicationId, item.category))}
            onSnooze={(duration) => void run(item.id, () => snooze(item.applicationId, item.category, duration))}
            onSnoozeOpen={() => setSnoozeId((current) => current === item.id ? "" : item.id)}
            snoozeOpen={snoozeId === item.id}
          />
        ))}
      </div>
    </div>
  );
}
