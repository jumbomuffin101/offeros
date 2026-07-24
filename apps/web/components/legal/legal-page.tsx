import Link from "next/link";
import type { ReactNode } from "react";
import { Layers3 } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between border-b border-slate-700/35 pb-5"><Link className="flex items-center gap-2 font-semibold text-white" href="/"><span className="flex size-9 items-center justify-center rounded-lg bg-indigo-400/12 text-indigo-200"><Layers3 className="size-4" /></span>OfferOS</Link><div className="flex gap-4 text-sm text-slate-500"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></header><article className="py-10"><h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-slate-500">Last updated {updated}</p><div className="legal-copy mt-8 space-y-7 text-sm leading-7 text-slate-400">{children}</div></article></div></main>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-lg font-semibold text-slate-100">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
