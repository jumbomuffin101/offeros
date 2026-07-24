import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return <main className="flex min-h-[60dvh] items-center justify-center px-4"><div className="text-center"><Compass className="mx-auto size-8 text-indigo-300" /><h1 className="mt-4 text-2xl font-semibold text-white">This OfferOS page was not found</h1><p className="mt-2 text-sm text-slate-500">The link may be outdated or the resource may have been removed.</p><Link className="mt-5 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white" href="/">Return to Today</Link></div></main>;
}
