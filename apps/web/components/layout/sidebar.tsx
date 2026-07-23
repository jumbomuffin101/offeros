"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Command,
  FileText,
  Gauge,
  GraduationCap,
  Search,
  Settings,
  Layers3,
} from "lucide-react";
import { ConnectionStatus } from "@/components/pwa/connection-status";
import { UserAccount } from "@/components/auth/user-account";
import { cn } from "@/lib/utils";
import { FocusWidget } from "@/components/layout/focus-widget";

const navItems = [
  { label: "Dashboard", href: "/", icon: Gauge },
  { label: "Applications", href: "/applications", icon: BriefcaseBusiness },
  { label: "Resumes", href: "/resumes", icon: FileText },
  { label: "Prep", href: "/prep", icon: GraduationCap },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-80 shrink-0 border-r border-slate-700/35 bg-[#151722] px-4 py-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link
        href="/"
        className="mb-5 flex items-center gap-3 rounded-xl border border-slate-700/35 bg-slate-800/25 p-3 transition hover:border-slate-600/45 hover:bg-slate-800/40"
      >
        <div className="flex size-11 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-400/12 text-sm font-bold text-indigo-200">
          <Layers3 className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-normal text-white">OfferOS</div>
          <div className="truncate text-xs text-slate-500">Technical recruiting command center</div>
        </div>
      </Link>

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-700/35 bg-slate-900/35 px-3 py-2.5 text-sm text-slate-400">
        <Search className="size-4 text-slate-500" />
        <span className="flex-1">Search or jump</span>
        <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
          <Command className="size-3" /> K
        </span>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-slate-400 transition duration-200 hover:bg-slate-800/45 hover:text-slate-100",
                active &&
                  "border-indigo-400/20 bg-indigo-400/10 text-indigo-100",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-indigo-300" />
              ) : null}
              <span className="flex size-8 items-center justify-center rounded-lg border border-slate-700/35 bg-slate-800/30 transition group-hover:border-indigo-400/20 group-hover:bg-indigo-400/10">
                <Icon className="size-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <ConnectionStatus />
        <div className="rounded-xl border border-slate-700/35 bg-slate-800/25 p-4">
          <UserAccount />
        </div>
        <FocusWidget />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 border-b border-slate-700/35 bg-[#151722]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-400/12 text-xs text-indigo-200">
            <Layers3 className="size-4" />
          </span>
          OfferOS
        </Link>
        <div className="flex items-center gap-3">
          <ConnectionStatus compact />
          <UserAccount compact />
          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
            Ctrl K
          </span>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-slate-400 transition",
                active && "border-indigo-400/20 bg-indigo-400/10 text-indigo-100",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
