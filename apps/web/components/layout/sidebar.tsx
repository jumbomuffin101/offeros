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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <aside className="hidden h-screen w-80 shrink-0 border-r border-white/10 bg-slate-950/60 px-4 py-5 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link
        href="/"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:bg-white/[0.055]"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/12 text-sm font-bold text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.22)]">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-normal text-white">OfferOS</div>
          <div className="truncate text-xs text-slate-500">Aryan&apos;s recruiting workspace</div>
        </div>
      </Link>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/55 px-3 py-2.5 text-sm text-slate-400 shadow-inner shadow-black/10">
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
                "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 transition duration-200 hover:bg-white/[0.055] hover:text-white",
                active &&
                  "border border-cyan-300/22 bg-cyan-300/10 text-cyan-50 shadow-[0_12px_44px_rgba(34,211,238,0.1)]",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
              ) : null}
              <span className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] transition group-hover:border-cyan-300/20 group-hover:bg-cyan-300/10">
                <Icon className="size-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 text-sm font-semibold text-slate-950">
              AR
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Aryan Rawat</div>
              <div className="text-xs text-slate-500">CS recruiting board</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Focus
        </div>
        <div className="mt-3 text-sm font-semibold text-white">July internship push</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep applications, OAs, and prep sessions moving without losing context.
        </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/82 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/12 text-xs text-cyan-100">
            <Sparkles className="size-4" />
          </span>
          OfferOS
        </Link>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
          Ctrl K
        </span>
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
                active && "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
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
