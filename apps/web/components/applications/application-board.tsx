"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { ApplicationColumn } from "@/components/applications/application-column";
import { ApplicationDetailDrawer } from "@/components/applications/application-detail-drawer";
import { ApplicationFilters } from "@/components/applications/application-filters";
import {
  ApplicationFormModal,
  type ApplicationFormPayload,
} from "@/components/applications/application-form-modal";
import { ApplicationStats } from "@/components/applications/application-stats";
import { Button } from "@/components/ui/button";
import { applicationStatuses } from "@/lib/mock-data";
import {
  defaultApplicationFilters,
  filterApplications,
  sortApplications,
  uniqueValues,
  type ApplicationFiltersState,
  type ApplicationSortKey,
} from "@/lib/application-utils";
import {
  loadStoredApplications,
  resetStoredApplications,
  saveStoredApplications,
} from "@/lib/application-storage";
import type { Application, ApplicationStatus } from "@/lib/types";

const OPEN_ADD_EVENT = "offeros:add-application";
const OPEN_ADD_STORAGE_KEY = "offeros:open-add-application";

export function ApplicationBoard({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ApplicationFiltersState>(defaultApplicationFilters);
  const [sortKey, setSortKey] = useState<ApplicationSortKey>("deadlineSoonest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    window.queueMicrotask(() => {
      setApplications(loadStoredApplications(initialApplications));
      setHydrated(true);

      if (window.sessionStorage.getItem(OPEN_ADD_STORAGE_KEY) === "true") {
        window.sessionStorage.removeItem(OPEN_ADD_STORAGE_KEY);
        setFormOpen(true);
      }
    });
  }, [initialApplications]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveStoredApplications(applications);
  }, [applications, hydrated]);

  useEffect(() => {
    function openAddApplication() {
      setEditingApplication(null);
      setFormOpen(true);
    }

    window.addEventListener(OPEN_ADD_EVENT, openAddApplication);
    return () => window.removeEventListener(OPEN_ADD_EVENT, openAddApplication);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibleApplications = useMemo(
    () => sortApplications(filterApplications(applications, search, filters), sortKey),
    [applications, filters, search, sortKey],
  );

  const selectedApplication =
    applications.find((application) => application.id === selectedApplicationId) ?? null;
  const pendingDelete =
    applications.find((application) => application.id === pendingDeleteId) ?? null;

  const sources = useMemo(() => uniqueValues(applications, "source"), [applications]);
  const resumeNames = useMemo(() => uniqueValues(applications, "resumeUsed"), [applications]);
  const hasActiveQuery =
    Boolean(search.trim()) ||
    filters.status !== "All" ||
    filters.priority !== "All" ||
    filters.source !== "All" ||
    filters.resumeUsed !== "All";

  function createApplication(payload: ApplicationFormPayload) {
    const now = new Date().toISOString();
    const application: Application = {
      ...payload,
      id: `${slugify(payload.company)}-${Date.now()}`,
      category: inferCategory(payload),
      createdAt: now,
      updatedAt: now,
    };

    setApplications((current) => [application, ...current]);
    setFormOpen(false);
    setToast("Application added.");
  }

  function updateApplication(payload: ApplicationFormPayload) {
    if (!editingApplication) {
      return;
    }

    const updated: Application = {
      ...editingApplication,
      ...payload,
      category: inferCategory(payload),
      updatedAt: new Date().toISOString(),
    };

    setApplications((current) =>
      current.map((application) =>
        application.id === editingApplication.id ? updated : application,
      ),
    );
    setEditingApplication(null);
    setFormOpen(false);
    setSelectedApplicationId(updated.id);
    setToast("Application updated.");
  }

  function moveApplication(id: string, status: ApplicationStatus) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id
          ? { ...application, status, updatedAt: new Date().toISOString() }
          : application,
      ),
    );
    setToast(`Moved to ${status}.`);
  }

  function deleteApplication(id: string) {
    setApplications((current) => current.filter((application) => application.id !== id));
    setPendingDeleteId(null);
    setSelectedApplicationId(null);
    setToast("Application deleted.");
  }

  function resetDemoData() {
    const reset = resetStoredApplications(initialApplications);
    setApplications(reset);
    setSelectedApplicationId(null);
    setPendingDeleteId(null);
    setSearch("");
    setFilters(defaultApplicationFilters);
    setSortKey("deadlineSoonest");
    setToast("Demo data restored.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ApplicationStats applications={applications} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ApplicationFilters
            filterOpen={filterOpen}
            filters={filters}
            onFilterOpenChange={setFilterOpen}
            onFiltersChange={setFilters}
            onSearchChange={setSearch}
            onSortChange={setSortKey}
            onSortOpenChange={setSortOpen}
            resumes={resumeNames}
            search={search}
            sortKey={sortKey}
            sortOpen={sortOpen}
            sources={sources}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingApplication(null);
              setFormOpen(true);
            }}
            type="button"
            variant="primary"
          >
            <Plus className="size-4" />
            Add Application
          </Button>
          <Button onClick={resetDemoData} type="button" variant="ghost">
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {applicationStatuses.map((status) => (
          <ApplicationColumn
            applications={visibleApplications.filter(
              (application) => application.status === status,
            )}
            hasActiveQuery={hasActiveQuery}
            key={status}
            onOpenApplication={(application) => setSelectedApplicationId(application.id)}
            onStatusChange={moveApplication}
            status={status}
          />
        ))}
      </div>

      <ApplicationFormModal
        application={editingApplication}
        onClose={() => {
          setFormOpen(false);
          setEditingApplication(null);
        }}
        onSubmit={editingApplication ? updateApplication : createApplication}
        open={formOpen}
      />

      <ApplicationDetailDrawer
        application={selectedApplication}
        onClose={() => setSelectedApplicationId(null)}
        onDelete={(id) => setPendingDeleteId(id)}
        onEdit={(application) => {
          setEditingApplication(application);
          setFormOpen(true);
        }}
        onStatusChange={moveApplication}
      />

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-xl">
          <div className="glass-card page-enter w-full max-w-md rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white">Delete application?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This removes {pendingDelete.company} from your local tracker. You can restore demo
              data later, but this specific local edit will be lost.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setPendingDeleteId(null)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button onClick={() => deleteApplication(pendingDelete.id)} type="button" variant="primary">
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-medium text-emerald-100 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferCategory(payload: ApplicationFormPayload): Application["category"] {
  const content = [
    payload.company,
    payload.role,
    payload.source,
    payload.resumeUsed,
    payload.notes,
    ...payload.tags,
  ]
    .join(" ")
    .toLowerCase();

  if (content.includes("google") || content.includes("meta")) {
    return "Big Tech";
  }

  if (content.includes("finance") || content.includes("bank") || content.includes("quant")) {
    return "Finance";
  }

  if (content.includes("stripe") || content.includes("capital") || content.includes("payment")) {
    return "Fintech";
  }

  if (content.includes("data") || content.includes("observability")) {
    return "Data";
  }

  return "Startup";
}
