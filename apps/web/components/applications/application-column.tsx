"use client";

import type { Application, ApplicationStatus } from "@/lib/types";
import { ApplicationCard } from "@/components/applications/application-card";

export function ApplicationColumn({
  status,
  applications,
  hasActiveQuery,
  onOpenApplication,
  onStatusChange,
}: {
  status: ApplicationStatus;
  applications: Application[];
  hasActiveQuery: boolean;
  onOpenApplication: (application: Application) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  return (
    <section className="min-h-72 rounded-3xl border border-white/10 bg-slate-950/32 p-3 shadow-inner shadow-black/20">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{status}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Status lane</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
          {applications.length}
        </span>
      </div>

      <div className="space-y-3">
        {applications.map((application) => (
          <ApplicationCard
            application={application}
            key={application.id}
            onOpen={onOpenApplication}
            onStatusChange={onStatusChange}
          />
        ))}

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-5 text-center">
            <div className="text-sm font-medium text-slate-300">
              {hasActiveQuery ? "No matches for your current filters." : "No applications here yet."}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {hasActiveQuery
                ? "Try clearing search, filters, or sort order."
                : "New applications will appear here when assigned to this status."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
