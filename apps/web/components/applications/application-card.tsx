"use client";

import { CalendarClock, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
} from "@/lib/application-utils";
import type { Application, ApplicationStatus } from "@/lib/types";

const statusTone: Record<ApplicationStatus, "cyan" | "green" | "amber" | "red" | "purple" | "slate"> = {
  Wishlist: "slate",
  Applying: "cyan",
  Applied: "purple",
  OA: "amber",
  Interview: "cyan",
  "Final Round": "purple",
  Offer: "green",
  Rejected: "red",
};

const priorityTone = {
  Low: "slate",
  Medium: "amber",
  High: "red",
} as const;

export function ApplicationCard({
  application,
  onOpen,
  onStatusChange,
}: {
  application: Application;
  onOpen: (application: Application) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  return (
    <Card
      className="premium-hover group p-4"
      onClick={() => onOpen(application)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(application);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-white">{application.company}</div>
          <div className="mt-1 text-sm font-medium text-slate-300">{application.role}</div>
          <div className="mt-1 text-xs text-slate-500">{application.location}</div>
        </div>
        <div className="flex items-center gap-1">
          <GripVertical className="size-4 text-slate-600 transition group-hover:text-slate-400" />
          <Badge tone={statusTone[application.status]}>{application.status}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={priorityTone[application.priority]}>{application.priority}</Badge>
        {application.tags.slice(0, 2).map((tag) => (
          <span
            className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-slate-400"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
          <div className="text-slate-500">Deadline</div>
          <div className="mt-1 font-medium text-slate-200">{formatDate(application.deadline)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
          <div className="text-slate-500">Resume</div>
          <div className="mt-1 truncate font-medium text-slate-200">{application.resumeUsed}</div>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-xs leading-5 text-slate-400">
        {application.notes || "No notes yet."}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarClock className="size-3.5" />
          Applied {formatDate(application.dateApplied)}
        </div>
        {application.jobUrl ? <ExternalLink className="size-3.5 text-slate-600" /> : null}
      </div>

      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
        <select
          aria-label={`Move ${application.company} status`}
          className="h-9 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-xs text-slate-200 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
          onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
          value={application.status}
        >
          {Object.keys(statusTone).map((status) => (
            <option key={status} value={status}>
              Move to {status}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
