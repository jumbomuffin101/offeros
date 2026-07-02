"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/components/pwa/pwa-provider";

export function InstallBanner() {
  const { canInstall, dismissInstall, install, installDismissed, isInstalled } = usePwa();

  if (!canInstall || installDismissed || isInstalled) return null;

  return (
    <aside
      aria-label="Install OfferOS"
      className="page-enter fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-indigo-400/20 bg-[#202336]/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-400/10 text-indigo-200">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">Install OfferOS</div>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">
          Open your local recruiting workspace like a desktop app.
        </p>
      </div>
      <Button className="h-9 px-3" onClick={() => void install()}>
        Install
      </Button>
      <button
        aria-label="Dismiss install prompt"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
        onClick={dismissInstall}
        type="button"
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}
