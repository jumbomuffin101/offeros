"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Code2, FileStack, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearWorkspaceData, ONBOARDING_KEY, populateDemoWorkspace } from "@/lib/workspace-data";

const benefits = [
  { title: "Track every application", detail: "Keep deadlines, contacts, and pipeline stages in one calm workspace.", icon: BriefcaseBusiness },
  { title: "Manage resume versions", detail: "Organize targeted resumes and understand where each version is used.", icon: FileStack },
  { title: "Stay consistent with prep", detail: "Build a repeatable coding, behavioral, and system design practice rhythm.", icon: Code2 },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"demo" | "fresh" | null>(null);

  useEffect(() => {
    window.queueMicrotask(() => setOpen(!window.localStorage.getItem(ONBOARDING_KEY)));
  }, []);

  function complete(mode: "demo" | "fresh") {
    setLoading(mode);
    if (mode === "demo") populateDemoWorkspace();
    else clearWorkspaceData();
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    window.location.reload();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0f18]/88 px-4 py-8 backdrop-blur-xl">
      <section className="glass-card page-enter w-full max-w-3xl rounded-2xl p-6 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-description">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-400/12 text-indigo-200"><Layers3 className="size-6" /></div>
        <div className="mt-5 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white" id="welcome-title">Welcome to OfferOS</h1>
          <p className="mt-2 text-base text-slate-400" id="welcome-description">The operating system for software engineering recruiting.</p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {benefits.map((benefit) => { const Icon = benefit.icon; return <div className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-4" key={benefit.title}><Icon className="size-5 text-indigo-300" /><h2 className="mt-4 text-sm font-semibold text-white">{benefit.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{benefit.detail}</p></div>; })}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Button disabled={loading !== null} onClick={() => complete("fresh")} variant="secondary">{loading === "fresh" ? "Preparing workspace..." : "Start Fresh"}</Button>
          <Button disabled={loading !== null} onClick={() => complete("demo")} variant="primary">{loading === "demo" ? "Loading demo data..." : "Start with Demo Data"}</Button>
        </div>
      </section>
    </div>
  );
}
