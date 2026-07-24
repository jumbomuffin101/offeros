"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { useInbox } from "@/hooks/use-inbox";

export function FocusWidget() {
  const { inbox } = useInbox();
  const focus = inbox?.items[0];
  if (!focus) return null;
  return <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-indigo-200/70"><Target className="size-3.5" />Focus</div><div className="mt-3 text-sm font-semibold text-white">{focus.company} - {focus.role}</div><p className="mt-1 text-sm leading-5 text-slate-300">{focus.description}</p>{focus.dueAt ? <p className="mt-2 text-xs text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(focus.dueAt))}</p> : null}<Link className="mt-3 inline-flex text-xs font-medium text-indigo-200 hover:text-indigo-100" href={`/applications?open=${focus.applicationId}`}>Open application</Link></div>;
}
