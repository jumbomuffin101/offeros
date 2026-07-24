"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error("[OfferOS route error]", error);
  }, [error]);
  return <section className="mx-auto max-w-xl rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-6 py-12 text-center"><AlertTriangle className="mx-auto size-7 text-rose-200" /><h1 className="mt-4 text-xl font-semibold text-white">This workspace view could not load</h1><p className="mt-2 text-sm leading-6 text-slate-400">Your existing data has not been changed. Retry the view, or use the navigation to continue elsewhere.</p><Button className="mt-5" onClick={reset} variant="primary"><RefreshCw className="size-4" />Try again</Button>{error.digest ? <p className="mt-4 text-xs text-slate-600">Support reference: {error.digest}</p> : null}</section>;
}
