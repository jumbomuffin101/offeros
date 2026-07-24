import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import type { ApplicationAttentionItem } from "@/lib/types";
import { AttentionItemCard } from "@/components/inbox/attention-item-card";

export function NeedsAttention({ items }: { items: ApplicationAttentionItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-indigo-300/15 bg-[#1b1d2b] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-indigo-200/70"><BellRing className="size-4" />Needs attention</div>
          <h2 className="mt-2 text-xl font-semibold text-white">What to do today</h2>
          <p className="mt-1 text-sm text-slate-500">Highest-priority application signals, ranked deterministically.</p>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-indigo-200 hover:text-indigo-100" href="/inbox">View all <ArrowRight className="size-4" /></Link>
      </div>
      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {items.slice(0, 5).map((item) => <AttentionItemCard compact item={item} key={item.id} />)}
      </div>
    </section>
  );
}
