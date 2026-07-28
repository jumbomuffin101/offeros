"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenProvider } from "@/lib/data/api/apiClient";

const jwtTemplate = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE || undefined;

export function ClerkTokenProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    authDiagnostic({
      clerk_loaded: isLoaded,
      signed_in: Boolean(isSignedIn),
      token_template: jwtTemplate ?? "default",
    });
    setAuthTokenProvider(async () => {
      authDiagnostic({
        token_requested: true,
        token_template: jwtTemplate ?? "default",
      });
      try {
        const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
        authDiagnostic({
          token_present: Boolean(token),
          token_template: jwtTemplate ?? "default",
        });
        return token;
      } catch (error) {
        authDiagnostic({
          token_error: error instanceof Error ? error.name : "UnknownError",
          token_template: jwtTemplate ?? "default",
        });
        throw error;
      }
    });
    return () => setAuthTokenProvider(null);
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <div className="min-h-screen animate-pulse bg-[#151722]" aria-label="Loading authenticated workspace" />;
  }

  return children;
}

function authDiagnostic(details: Record<string, unknown>) {
  console.info(`[OfferOS Auth Diagnostic] ${JSON.stringify(details)}`);
}
