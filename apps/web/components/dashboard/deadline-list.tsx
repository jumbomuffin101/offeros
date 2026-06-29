import { CalendarClock } from "lucide-react";
import type { Deadline } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const urgencyTone = {
  Low: "slate",
  Medium: "amber",
  High: "red",
} as const;

export function DeadlineList({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Upcoming Deadlines</h2>
          <CalendarClock className="size-5 text-amber-200" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.map((deadline) => (
          <div
            key={deadline.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-amber-300/20 hover:bg-white/[0.045]"
          >
            <div>
              <div className="text-sm font-medium text-white">{deadline.company}</div>
              <div className="mt-1 text-xs text-slate-500">{deadline.title}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-100">{deadline.due}</div>
              <Badge tone={urgencyTone[deadline.urgency]} className="mt-1">
                {deadline.urgency}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
