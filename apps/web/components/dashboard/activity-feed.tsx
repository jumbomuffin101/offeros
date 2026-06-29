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
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="pt-1.5">
              <span className={cn("block size-2.5 rounded-full", dotTone[activity.tone])} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-white">{activity.label}</p>
                <span className="shrink-0 text-xs text-slate-500">{activity.time}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{activity.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
