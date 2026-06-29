import { CalendarDays, Target } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const week = [
  { day: "M", value: 72 },
  { day: "T", value: 88 },
  { day: "W", value: 62 },
  { day: "T", value: 91 },
  { day: "F", value: 78 },
  { day: "S", value: 46 },
  { day: "S", value: 68 },
];

export function MomentumCard() {
  return (
    <Card className="premium-hover">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Recruiting Momentum</h2>
            <p className="mt-1 text-sm text-slate-500">Weekly focus score across prep and outreach.</p>
          </div>
          <Target className="size-5 text-cyan-200" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="relative flex size-32 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_180deg,#22d3ee_0_78%,rgba(30,41,59,0.85)_78%_100%)] p-2 shadow-[0_0_48px_rgba(34,211,238,0.12)]">
            <div className="flex size-full flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950/90">
              <span className="text-3xl font-semibold text-white">78</span>
              <span className="text-xs text-slate-500">score</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <CalendarDays className="size-4 text-cyan-300" />
              Strongest day: Thursday
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are ahead on prep consistency but have one outreach block left to hit this week&apos;s application goal.
            </p>
            <div className="mt-4 flex h-16 items-end gap-2">
              {week.map((item, index) => (
                <div className="flex flex-1 flex-col items-center gap-2" key={`${item.day}-${index}`}>
                  <div className="h-12 w-full rounded-full bg-slate-900/90">
                    <div
                      className="mt-auto rounded-full bg-gradient-to-t from-cyan-500 to-emerald-300"
                      style={{ height: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
