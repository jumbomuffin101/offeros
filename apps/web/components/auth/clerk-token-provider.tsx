"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenProvider } from "@/lib/data/api/apiClient";

const jwtTemplate = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE || undefined;

export function ClerkTokenProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenProvider(() => getToken(jwtTemplate ? { template: jwtTemplate } : undefined));
    return () => setAuthTokenProvider(null);
  }, [getToken, isLoaded]);

  if (!isLoaded) {
    return <div className="min-h-screen animate-pulse bg-[#151722]" aria-label="Loading authenticated workspace" />;
  }

  return children;
}
