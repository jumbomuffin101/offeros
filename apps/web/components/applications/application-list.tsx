"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import { formatDate, formatDateTime } from "@/lib/application-utils";
import type { Application, ApplicationPriority, ApplicationStatus } from "@/lib/types";

const priorities: ApplicationPriority[] = ["High", "Medium", "Low"];

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

const priorityTone: Record<ApplicationPriority, "amber" | "red" | "slate"> = {
  High: "red",
  Medium: "amber",
  Low: "slate",
};

export function ApplicationList({
  applications,
  onOpenApplication,
  onPriorityChange,
  onStatusChange,
}: {
  applications: Application[];
  onOpenApplication: (application: Application) => void;
  onPriorityChange: (id: string, priority: ApplicationPriority) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/35 bg-[#1b1d2b]/80">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="border-b border-slate-700/40 bg-slate-900/35 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Resume</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {applications.map((application) => (
              <tr
                className="cursor-pointer transition hover:bg-slate-800/35"
                key={application.id}
                onClick={() => onOpenApplication(application)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenApplication(application);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <td className="max-w-[180px] px-4 py-3">
                  <div className="truncate font-semibold text-white">{application.company}</div>
                  <div className="truncate text-xs text-slate-500">{application.location || "Location not set"}</div>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-slate-300"><div className="truncate">{application.role}</div></td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <InlineSelect
                    label={`${application.company} status`}
                    onChange={(value) => onStatusChange(application.id, value as ApplicationStatus)}
                    options={APPLICATION_STATUSES}
                    tone={statusTone[application.status]}
                    value={application.status}
                  />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <InlineSelect
                    label={`${application.company} priority`}
                    onChange={(value) => onPriorityChange(application.id, value as ApplicationPriority)}
                    options={priorities}
                    tone={priorityTone[application.priority]}
                    value={application.priority}
                  />
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(application.deadline)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(application.dateApplied)}</td>
                <td className="max-w-[130px] px-4 py-3 text-slate-400"><div className="truncate">{application.source || "Not set"}</div></td>
                <td className="max-w-[150px] px-4 py-3 text-slate-400"><div className="truncate">{application.resumeUsed || "Not set"}</div></td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[170px] flex-wrap gap-1.5">
                    {application.tags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                    {application.tags.length > 2 ? <span className="text-xs text-slate-500">+{application.tags.length - 2}</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(application.updatedAt)}</td>
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {application.jobUrl ? <a aria-label="Open job posting" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-indigo-100" href={application.jobUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" /></a> : null}
                    <Button onClick={() => onOpenApplication(application)} variant="ghost"><Pencil className="size-4" />Open</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-700/35 lg:hidden">
        {applications.map((application) => (
          <button className="block w-full px-4 py-4 text-left transition hover:bg-slate-800/35" key={application.id} onClick={() => onOpenApplication(application)} type="button">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{application.company}</div>
                <div className="mt-1 truncate text-sm text-slate-400">{application.role}</div>
              </div>
              <Badge tone={statusTone[application.status]}>{application.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>Deadline: <span className="text-slate-300">{formatDate(application.deadline)}</span></div>
              <div>Applied: <span className="text-slate-300">{formatDate(application.dateApplied)}</span></div>
              <div>Priority: <span className="text-slate-300">{application.priority}</span></div>
              <div>Source: <span className="text-slate-300">{application.source || "Not set"}</span></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineSelect({
  label,
  onChange,
  options,
  tone,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  tone: "cyan" | "green" | "amber" | "red" | "purple" | "slate";
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className={`h-8 rounded-lg border px-2 text-xs outline-none transition focus:ring-2 focus:ring-indigo-400/20 ${toneClass(tone)}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function toneClass(tone: "cyan" | "green" | "amber" | "red" | "purple" | "slate") {
  const tones = {
    cyan: "border-indigo-400/25 bg-indigo-400/10 text-indigo-100",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    red: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    purple: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    slate: "border-slate-500/35 bg-slate-500/10 text-slate-200",
  };
  return tones[tone];
}
