"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwa } from "@/components/pwa/pwa-provider";

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { isOnline } = usePwa();
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        compact
          ? "text-slate-400"
          : "rounded-xl border border-slate-700/35 bg-slate-800/25 px-3 py-2.5",
      )}
      title={isOnline ? "Local workspace ready" : "Local data remains available offline"}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          isOnline ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className={cn(compact ? "font-medium" : "min-w-0")}>
        <span className="block font-medium text-slate-200">{isOnline ? "Online" : "Offline"}</span>
        {!compact ? (
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {isOnline ? "Local workspace synced on this device" : "Local data remains available"}
          </span>
        ) : null}
      </span>
    </div>
  );
}
