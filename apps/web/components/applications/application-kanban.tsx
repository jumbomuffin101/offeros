import { Filter, ListFilter, Plus, Search } from "lucide-react";
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
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button variant="primary">
            <Plus className="size-4" />
            Add Application
          </Button>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input className="pl-9" placeholder="Search applications" />
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
              className="min-h-64 rounded-2xl border border-white/10 bg-slate-950/28 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{status}</h2>
                <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map((application) => (
                  <Card
                    key={application.id}
                    className="p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {application.company}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">{application.role}</div>
                      </div>
                      <Badge tone={statusTone[application.status]}>{application.status}</Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <div className="flex justify-between gap-3">
                        <span>Location</span>
                        <span className="text-right text-slate-300">{application.location}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Date applied</span>
                        <span className="text-slate-300">{application.dateApplied ?? "Not sent"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Deadline</span>
                        <span className="text-slate-300">{application.deadline ?? "None"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Source</span>
                        <span className="text-slate-300">{application.source}</span>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
                      {application.notes}
                    </p>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
