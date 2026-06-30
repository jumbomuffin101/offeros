"use client";

import { ExternalLink, Mail, Pencil, Trash2, X } from "lucide-react";
import { applicationStatuses } from "@/lib/mock-data";
import { formatDate, formatDateTime } from "@/lib/application-utils";
import type { Application, ApplicationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const priorityTone = {
  Low: "slate",
  Medium: "amber",
  High: "red",
} as const;

export function ApplicationDetailDrawer({
  application,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  application: Application | null;
  onClose: () => void;
  onEdit: (application: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  if (!application) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-md">
      <aside className="page-enter ml-auto flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-slate-950/96 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={priorityTone[application.priority]}>{application.priority}</Badge>
              <Badge tone="cyan">{application.status}</Badge>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{application.company}</h2>
            <p className="mt-1 text-sm text-slate-400">{application.role}</p>
          </div>
          <button
            aria-label="Close application details"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Move status</span>
            <select
              className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
              onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
              value={application.status}
            >
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Detail label="Location" value={application.location || "Not set"} />
            <Detail label="Date applied" value={formatDate(application.dateApplied)} />
            <Detail label="Deadline" value={formatDate(application.deadline)} />
            <Detail label="Source" value={application.source || "Not set"} />
            <Detail label="Resume used" value={application.resumeUsed || "Not set"} />
            <Detail label="Salary range" value={application.salaryRange || "Not set"} />
            <Detail label="Recruiter" value={application.recruiterName || "Not set"} />
            <Detail label="Recruiter email" value={application.recruiterEmail || "Not set"} />
          </div>

          {application.jobUrl ? (
            <a
              className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              href={application.jobUrl}
              rel="noreferrer"
              target="_blank"
            >
              Job posting
              <ExternalLink className="size-4" />
            </a>
          ) : null}

          {application.recruiterEmail ? (
            <a
              className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              href={`mailto:${application.recruiterEmail}`}
            >
              Email recruiter
              <Mail className="size-4" />
            </a>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="text-xs font-medium text-slate-500">Tags</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {application.tags.length ? (
                application.tags.map((tag) => (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No tags</span>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="text-xs font-medium text-slate-500">Notes</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {application.notes || "No notes yet."}
            </p>
          </div>

          <div className="mt-5 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
            <div>Created {formatDateTime(application.createdAt)}</div>
            <div>Updated {formatDateTime(application.updatedAt)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-between">
          <Button onClick={() => onDelete(application.id)} type="button" variant="ghost">
            <Trash2 className="size-4" />
            Delete
          </Button>
          <div className="flex gap-3">
            <Button onClick={onClose} type="button" variant="secondary">
              Close
            </Button>
            <Button onClick={() => onEdit(application)} type="button" variant="primary">
              <Pencil className="size-4" />
              Edit
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-200">{value}</div>
    </div>
  );
}
