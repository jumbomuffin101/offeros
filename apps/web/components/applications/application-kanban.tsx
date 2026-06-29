import { Filter, GripVertical, ListFilter, Plus, Search } from "lucide-react";
import type { Application, ApplicationStatus } from "@/lib/types";
import { applicationStatuses } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export function ApplicationKanban({ applications }: { applications: Application[] }) {
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Button variant="primary">
            <Plus className="size-4" />
            Add Application
          </Button>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input className="pl-9 pr-16" placeholder="Search applications" />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
                Ctrl K
              </span>
            </div>
            <Button>
              <Filter className="size-4" />
              Filter
            </Button>
            <Button>
              <ListFilter className="size-4" />
              Sort
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        {applicationStatuses.map((status) => {
          const items = applications.filter((application) => application.status === status);

          return (
            <section
              key={status}
              className="min-h-72 rounded-3xl border border-white/10 bg-slate-950/32 p-3 shadow-inner shadow-black/20"
            >
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">{status}</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Ready for drag-and-drop</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map((application) => (
                  <Card
                    key={application.id}
                    className="premium-hover p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-white">
                          {application.company}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-300">{application.role}</div>
                        <div className="mt-1 text-xs text-slate-500">{application.location}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <GripVertical className="size-4 text-slate-600 transition group-hover:text-slate-400" />
                        <Badge tone={statusTone[application.status]}>{application.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Applied</span>
                        <span className="text-slate-300">{application.dateApplied ?? "Draft"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Due</span>
                        <span className="text-slate-300">{application.deadline ?? "None"}</span>
                      </div>
                      <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Source</span>
                          <span className="font-medium text-slate-300">{application.source}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-xs leading-5 text-slate-400">
                      {application.notes}
                    </p>
                  </Card>
                ))}
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-4 text-center text-sm text-slate-500">
                    No applications in this stage yet.
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
