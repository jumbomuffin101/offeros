"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Gauge,
  GraduationCap,
  Settings,
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
    <aside className="hidden h-screen w-72 shrink-0 border-r border-white/10 bg-slate-950/52 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/12 text-sm font-bold text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.2)]">
          OS
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide text-white">OfferOS</div>
          <div className="text-xs text-slate-500">Recruiting command center</div>
        </div>
      </Link>

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
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white",
                active &&
                  "border border-cyan-300/18 bg-cyan-300/10 text-cyan-50 shadow-[0_12px_40px_rgba(34,211,238,0.08)]",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Focus
        </div>
        <div className="mt-3 text-sm font-semibold text-white">July internship push</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep applications, OAs, and prep sessions moving without losing context.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/78 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/12 text-xs text-cyan-100">
            OS
          </span>
          OfferOS
        </Link>
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
                "flex min-w-fit items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-slate-400",
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
