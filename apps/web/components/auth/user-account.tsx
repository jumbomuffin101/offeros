"use client";

import { ClerkLoaded, ClerkLoading, UserButton, useUser } from "@clerk/nextjs";

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
        <div className={compact ? "flex items-center" : "flex min-w-0 items-center gap-3"}>
          <UserButton
            appearance={{ elements: { avatarBox: compact ? "size-8" : "size-9", userButtonPopoverCard: "border border-slate-700 bg-[#1b1d2b]" } }}
          />
          {!compact ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{name}</div>
              <div className="truncate text-xs text-slate-500">{email ?? "Signed in to OfferOS"}</div>
            </div>
          ) : null}
        </div>
      </ClerkLoaded>
    </>
  );
}
