"use client";

import Link from "next/link";
import { Clock3, FileText } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function RecentlyViewedCard() {
  const items = useRecentlyViewed();
  return <Card><CardHeader><div className="flex items-center gap-2"><Clock3 className="size-4 text-indigo-300" /><h2 className="text-lg font-semibold text-white">Recently Viewed</h2></div></CardHeader><CardContent className="space-y-2">{items.length ? items.map((item) => <Link className="flex items-center gap-3 rounded-lg border border-slate-700/35 bg-slate-900/20 p-3 transition hover:bg-slate-800/45" href={item.href} key={`${item.type}-${item.id}`}><span className="flex size-8 items-center justify-center rounded-lg bg-indigo-400/10 text-indigo-200"><FileText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-200">{item.label}</span><span className="block truncate text-xs text-slate-500">{item.type} · {item.detail}</span></span></Link>) : <div className="rounded-xl border border-dashed border-slate-700/40 px-4 py-8 text-center"><p className="text-sm text-slate-400">Open an application, resume, or prep item and it will appear here.</p></div>}</CardContent></Card>;
}
