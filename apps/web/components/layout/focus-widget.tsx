"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import type { FocusItem } from "@/lib/types";
import { applicationEventRepository } from "@/lib/data/repositories/repositoryFactory";

export function FocusWidget() {
  const [focus, setFocus] = useState<FocusItem | null>(null);
  useEffect(() => { let active = true; void applicationEventRepository.focus().then((value) => { if (active) setFocus(value); }).catch(() => {}); return () => { active = false; }; }, []);
  if (!focus) return null;
  return <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-indigo-200/70"><Target className="size-3.5" />Focus</div><div className="mt-3 text-sm font-semibold text-white">{focus.title}</div><p className="mt-1 text-sm leading-5 text-slate-300">{focus.subtitle}</p>{focus.dueAt ? <p className="mt-2 text-xs text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(focus.dueAt))}</p> : null}{focus.prepNextAction ? <p className="mt-2 border-t border-indigo-300/10 pt-2 text-xs leading-5 text-indigo-100/80">Prepare: {focus.prepNextAction}</p> : null}<Link className="mt-3 inline-flex text-xs font-medium text-indigo-200 hover:text-indigo-100" href={`/applications?open=${focus.applicationId}`}>Open application</Link></div>;
}
