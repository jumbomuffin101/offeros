"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  FilePlus2,
  FileText,
  Gauge,
  GraduationCap,
  Play,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";

const commands = [
  { label: "Open Dashboard", href: "/", icon: Gauge, hint: "Pipeline overview" },
  { label: "Open Applications", href: "/applications", icon: BriefcaseBusiness, hint: "Kanban tracker" },
  { label: "Open Resumes", href: "/resumes", icon: FileText, hint: "Resume versions" },
  { label: "Open Prep", href: "/prep", icon: GraduationCap, hint: "Daily practice" },
  { label: "Open Analytics", href: "/analytics", icon: BarChart3, hint: "Conversion insights" },
  { label: "Open Settings", href: "/settings", icon: Settings, hint: "Workspace preferences" },
  { label: "Add Application", href: "/applications", icon: FilePlus2, hint: "Mock action" },
  { label: "Upload Resume", href: "/resumes", icon: Upload, hint: "Mock action" },
  { label: "Start Daily Problem", href: "/prep", icon: Play, hint: "Mock action" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/72 px-4 pt-20 backdrop-blur-xl">
      <div className="glass-card page-enter w-full max-w-2xl rounded-3xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="size-5 text-cyan-200" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Command menu</div>
            <div className="text-xs text-slate-500">Navigate OfferOS or jump to a mock action</div>
          </div>
          <button
            aria-label="Close command menu"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3">
          {commands.map((command) => {
            const Icon = command.icon;

            return (
              <Link
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.055]"
                href={command.href}
                key={command.label}
                onClick={() => setOpen(false)}
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition group-hover:border-cyan-300/30 group-hover:bg-cyan-300/10">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{command.label}</span>
                  <span className="block text-xs text-slate-500">{command.hint}</span>
                </span>
                <span className="text-xs text-slate-600">Enter</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
