import { CalendarClock } from "lucide-react";
import type { DashboardDeadline } from "@/lib/dashboard-utils";
import { formatPrepDate } from "@/lib/prep-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const urgencyTone = {
  Low: "slate",
  Medium: "amber",
  High: "red",
} as const;

export function DeadlineList({ deadlines }: { deadlines: DashboardDeadline[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Upcoming Deadlines</h2>
          <CalendarClock className="size-5 text-amber-200" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length ? deadlines.map((deadline) => (
          <div
            key={deadline.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-amber-300/20 hover:bg-white/[0.045]"
          >
            <div>
              <div className="text-sm font-medium text-white">{deadline.company}</div>
              <div className="mt-1 text-xs text-slate-500">{deadline.role}</div>
              <div className="mt-1 text-[11px] text-slate-600">{deadline.status}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-100">{formatPrepDate(`${deadline.deadline}T12:00:00`)}</div>
              <Badge tone={urgencyTone[deadline.urgency]} className="mt-1">
                {deadline.urgency}
              </Badge>
            </div>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><CalendarClock className="mx-auto size-6 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-300">No upcoming deadlines</p><p className="mt-1 text-xs leading-5 text-slate-500">Add deadlines to applications to see the nearest commitments here.</p></div>}
      </CardContent>
    </Card>
  );
}
