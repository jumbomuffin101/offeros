import { Flame } from "lucide-react";
import type { PrepSession, WeeklyPrepDay } from "@/lib/types";
import { calculateStreak } from "@/lib/prep-utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function WeeklyProgress({ days, sessions }: { days: WeeklyPrepDay[]; sessions: PrepSession[] }) {
  const totals = {
    coding: sessions.filter((session) => session.type === "coding" && days.some((day) => day.date === localKey(session.completedAt))).length,
    behavioral: sessions.filter((session) => session.type === "behavioral" && days.some((day) => day.date === localKey(session.completedAt))).length,
    systemDesign: sessions.filter((session) => session.type === "systemDesign" && days.some((day) => day.date === localKey(session.completedAt))).length,
  };
  const streak = calculateStreak(days);
  return <Card><CardHeader><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Weekly progress</h2><p className="mt-1 text-sm text-slate-500">Your rolling seven-day prep rhythm.</p></div><div className="flex items-center gap-2 text-amber-200"><Flame className="size-5" /><span className="text-sm font-semibold">{streak} day streak</span></div></div></CardHeader><CardContent>
    <div className="grid grid-cols-7 gap-2">{days.map((day) => { const total = day.coding + day.behavioral + day.systemDesign; return <div className="text-center" key={day.date}><div className={`mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-lg border text-sm font-semibold transition ${total >= 3 ? "border-emerald-300/35 bg-emerald-300/25 text-emerald-50" : total === 2 ? "border-cyan-300/30 bg-cyan-300/18 text-cyan-50" : total === 1 ? "border-violet-300/25 bg-violet-300/12 text-violet-100" : "border-white/10 bg-white/[0.025] text-slate-600"}`}>{total}</div><div className="mt-1 text-[10px] text-slate-600">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</div></div>; })}</div>
    <div className="mt-5 grid grid-cols-3 gap-2">{[["Coding", totals.coding, "text-cyan-200"], ["Behavioral", totals.behavioral, "text-violet-200"], ["System", totals.systemDesign, "text-emerald-200"]].map(([label, value, tone]) => <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-center" key={String(label)}><div className={`text-xl font-semibold ${tone}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>)}</div>
  </CardContent></Card>;
}

function localKey(value: string) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
