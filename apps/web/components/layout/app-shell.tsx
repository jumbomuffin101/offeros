import type { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { InstallBanner } from "@/components/pwa/install-banner";
import { PwaProvider } from "@/components/pwa/pwa-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PwaProvider>
      <div className="min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileNav />
          <main className="page-enter relative mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
        <CommandPalette />
        <OnboardingModal />
        <InstallBanner />
      </div>
    </PwaProvider>
  );
}
