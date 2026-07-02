"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  { label: "Open Dashboard", href: "/", icon: Gauge, hint: "Pipeline overview", action: "navigate" },
  { label: "Open Applications", href: "/applications", icon: BriefcaseBusiness, hint: "Kanban tracker", action: "navigate" },
  { label: "Open Resumes", href: "/resumes", icon: FileText, hint: "Resume versions", action: "navigate" },
  { label: "Open Prep", href: "/prep", icon: GraduationCap, hint: "Daily practice", action: "navigate" },
  { label: "Open Analytics", href: "/analytics", icon: BarChart3, hint: "Conversion insights", action: "navigate" },
  { label: "Open Settings", href: "/settings", icon: Settings, hint: "Workspace preferences", action: "navigate" },
  { label: "Add Application", href: "/applications", icon: FilePlus2, hint: "Create a local tracker card", action: "add-application" },
  { label: "Upload Resume", href: "/resumes", icon: Upload, hint: "Create a local resume version", action: "upload-resume" },
  { label: "Start Daily Problem", href: "/prep", icon: Play, hint: "Open prep workspace", action: "navigate" },
];

const OPEN_ADD_EVENT = "offeros:add-application";
const OPEN_ADD_STORAGE_KEY = "offeros:open-add-application";
const OPEN_UPLOAD_EVENT = "offeros:upload-resume";
const OPEN_UPLOAD_STORAGE_KEY = "offeros:open-upload-resume";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0d0f18]/80 px-4 pt-20 backdrop-blur-lg">
      <div className="glass-card page-enter w-full max-w-2xl rounded-xl">
        <div className="flex items-center gap-3 border-b border-slate-700/40 px-5 py-4">
          <Search className="size-5 text-indigo-200" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Command menu</div>
            <div className="text-xs text-slate-500">Navigate OfferOS or start a workspace action</div>
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
            const content = (
              <>
                <span className="flex size-10 items-center justify-center rounded-lg border border-slate-700/40 bg-slate-800/35 text-indigo-200 transition group-hover:border-indigo-400/25 group-hover:bg-indigo-400/10">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{command.label}</span>
                  <span className="block text-xs text-slate-500">{command.hint}</span>
                </span>
                <span className="text-xs text-slate-600">Enter</span>
              </>
            );

            if (command.action === "add-application" || command.action === "upload-resume") {
              return (
                <button
                  className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.055]"
                  key={command.label}
                  onClick={() => {
                    setOpen(false);
                    const isResumeUpload = command.action === "upload-resume";
                    window.sessionStorage.setItem(
                      isResumeUpload ? OPEN_UPLOAD_STORAGE_KEY : OPEN_ADD_STORAGE_KEY,
                      "true",
                    );
                    window.dispatchEvent(new Event(isResumeUpload ? OPEN_UPLOAD_EVENT : OPEN_ADD_EVENT));
                    router.push(command.href);
                  }}
                  type="button"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.055]"
                href={command.href}
                key={command.label}
                onClick={() => setOpen(false)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
