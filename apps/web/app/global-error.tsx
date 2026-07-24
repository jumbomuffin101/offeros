"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[OfferOS global error]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#12131c] text-slate-100">
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-lg rounded-xl border border-rose-300/20 bg-[#1b1d2b] px-6 py-12 text-center">
            <h1 className="text-xl font-semibold">OfferOS could not load</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your workspace data has not been changed. Retry to continue.
            </p>
            <button
              className="mt-5 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
            {error.digest ? (
              <p className="mt-4 text-xs text-slate-600">Support reference: {error.digest}</p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
