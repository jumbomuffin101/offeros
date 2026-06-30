import type { Activity } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const dotTone = {
  info: "bg-cyan-300",
  success: "bg-emerald-300",
  warning: "bg-amber-300",
  danger: "bg-rose-300",
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </CardHeader>
      <CardContent>
        {activities.length ? <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-gradient-to-b before:from-cyan-300/40 before:via-slate-700 before:to-transparent">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex gap-4">
            <div className="pt-1.5">
              <span className={cn("relative z-10 block size-3 rounded-full ring-4 ring-slate-950/90", dotTone[activity.tone])} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-white">{activity.label}</p>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-slate-500">{activity.time}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{activity.detail}</p>
            </div>
          </div>
        ))}
        </div> : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><p className="text-sm font-medium text-slate-300">No recent activity</p><p className="mt-1 text-xs text-slate-500">Add an application, resume, or prep update to start the timeline.</p></div>}
      </CardContent>
    </Card>
  );
}
