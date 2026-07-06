"use client";

import { ClerkLoaded, ClerkLoading, UserButton, useUser } from "@clerk/nextjs";
import { LogoutButton } from "@/components/auth/logout-button";

export function UserAccount({ compact = false }: { compact?: boolean }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || user?.firstName || email || "OfferOS user";

  return (
    <>
      <ClerkLoading>
        <div className={compact ? "size-8 animate-pulse rounded-full bg-slate-700/60" : "h-10 w-full animate-pulse rounded-lg bg-slate-700/35"} />
      </ClerkLoading>
      <ClerkLoaded>
        {compact ? (
          <div className="flex items-center gap-2">
            <UserButton appearance={{ elements: { avatarBox: "size-8", userButtonPopoverCard: "border border-slate-700 bg-[#1b1d2b]" } }} />
            <LogoutButton compact />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <UserButton appearance={{ elements: { avatarBox: "size-9", userButtonPopoverCard: "border border-slate-700 bg-[#1b1d2b]" } }} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{name}</div>
                <div className="truncate text-xs text-slate-500">{email ?? "Signed in to OfferOS"}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        )}
      </ClerkLoaded>
    </>
  );
}
