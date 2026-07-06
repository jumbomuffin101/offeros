"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { signOut } = useClerk();

  return (
    <button
      aria-label="Log out of OfferOS"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/45 text-sm font-medium text-slate-400 transition hover:border-rose-300/25 hover:bg-rose-300/[0.07] hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
        compact ? "size-8" : "w-full px-3 py-2",
      )}
      onClick={() => void signOut({ redirectUrl: "/sign-in" })}
      title="Log out"
      type="button"
    >
      <LogOut className="size-4" />
      {!compact ? <span>Log out</span> : null}
    </button>
  );
}
