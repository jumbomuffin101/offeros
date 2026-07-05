import Link from "next/link";
import type { ReactNode } from "react";
import { Layers3, LockKeyhole } from "lucide-react";

export function AuthPageShell({ children, mode }: { children: ReactNode; mode: "sign-in" | "sign-up" }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#11131d] px-4 py-10 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/35 to-transparent" />
      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:gap-16">
        <section className="max-w-xl">
          <Link className="inline-flex items-center gap-3 text-white" href={mode === "sign-in" ? "/sign-in" : "/sign-up"}>
            <span className="flex size-11 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-400/12 text-indigo-200">
              <Layers3 className="size-5" />
            </span>
            <span className="text-lg font-semibold">OfferOS</span>
          </Link>
          <h1 className="mt-8 text-3xl font-semibold text-white sm:text-4xl">Your technical recruiting command center.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-400">
            Keep applications, targeted resumes, interview prep, and recruiting momentum organized in one focused workspace.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
            <span className="flex size-9 items-center justify-center rounded-lg border border-slate-700/45 bg-slate-800/35 text-indigo-200">
              <LockKeyhole className="size-4" />
            </span>
            Authentication is handled securely by Clerk. Your recruiting data remains local to this browser.
          </div>
        </section>
        <section className="flex justify-center lg:justify-end" aria-label={mode === "sign-in" ? "Sign in to OfferOS" : "Create an OfferOS account"}>
          {children}
        </section>
      </div>
    </main>
  );
}
