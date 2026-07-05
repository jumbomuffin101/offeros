"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

const publicAuthRoutes = ["/sign-in", "/sign-up"];

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = publicAuthRoutes.some((route) => pathname.startsWith(route));

  return isAuthRoute ? children : <AppShell>{children}</AppShell>;
}
