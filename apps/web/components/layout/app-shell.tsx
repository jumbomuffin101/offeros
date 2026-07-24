import type { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { InstallBanner } from "@/components/pwa/install-banner";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ClerkTokenProvider } from "@/components/auth/clerk-token-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import Link from "next/link";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ClerkTokenProvider>
      <ThemeProvider>
        <PwaProvider>
          <div className="min-h-screen lg:flex">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <MobileNav />
              <main className="page-enter relative mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
                {children}
              </main>
              <footer className="mx-auto flex w-full max-w-7xl flex-wrap gap-4 px-4 pb-8 text-xs text-slate-600 sm:px-6 lg:px-10"><span>OfferOS practice and organization tools</span><Link className="hover:text-slate-400" href="/privacy">Privacy</Link><Link className="hover:text-slate-400" href="/terms">Terms</Link></footer>
            </div>
            <CommandPalette />
            <OnboardingModal />
            <InstallBanner />
          </div>
        </PwaProvider>
      </ThemeProvider>
    </ClerkTokenProvider>
  );
}
