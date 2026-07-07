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
import { DataErrorState } from "@/components/ui/data-error-state";
import { Toast } from "@/components/ui/toast";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { useApplications } from "@/hooks/use-applications";
import { useResumes } from "@/hooks/use-resumes";
import { ESCAPE_EVENT } from "@/lib/action-events";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import {
  defaultApplicationFilters,
  filterApplications,
  sortApplications,
  uniqueValues,
  type ApplicationFiltersState,
  type ApplicationSortKey,
} from "@/lib/application-utils";
import type { Application, ApplicationStatus } from "@/lib/types";

const OPEN_ADD_EVENT = "offeros:add-application";
const OPEN_ADD_STORAGE_KEY = "offeros:open-add-application";

export function ApplicationBoard() {
  const applicationData = useApplications();
  const resumeData = useResumes();
  const applications = applicationData.applications;
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
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      if (window.sessionStorage.getItem(OPEN_ADD_STORAGE_KEY) === "true") {
        window.sessionStorage.removeItem(OPEN_ADD_STORAGE_KEY);
        setFormOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    function openAddApplication() {
      setEditingApplication(null);
      setFormOpen(true);
    }

    window.addEventListener(OPEN_ADD_EVENT, openAddApplication);
    return () => window.removeEventListener(OPEN_ADD_EVENT, openAddApplication);
  }, []);

  useEffect(() => {
    function closeOverlays() {
      setFormOpen(false); setEditingApplication(null); setSelectedApplicationId(null);
      setPendingDeleteId(null); setFilterOpen(false); setSortOpen(false);
    }
    window.addEventListener(ESCAPE_EVENT, closeOverlays);
    return () => window.removeEventListener(ESCAPE_EVENT, closeOverlays);
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

  async function createApplication(payload: ApplicationFormPayload) {
    try {
      await applicationData.create(payload);
      setFormOpen(false);
      setToast("Application saved");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function updateApplication(payload: ApplicationFormPayload) {
    if (!editingApplication) {
      return;
    }
    try {
      const updated = await applicationData.update(editingApplication.id, payload);
      setEditingApplication(null);
      setFormOpen(false);
      setSelectedApplicationId(updated.id);
      setToast("Application updated");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function moveApplication(id: string, status: ApplicationStatus) {
    try {
      await applicationData.setStatus(id, status);
      setToast(`Moved to ${status}.`);
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function deleteApplication(id: string) {
    try {
      await applicationData.delete(id);
      setPendingDeleteId(null);
      setSelectedApplicationId(null);
      setToast("Deleted successfully");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function resetDemoData() {
    if (resetting) return;
    setResetting(true);
    try {
      await applicationData.reset();
      setSelectedApplicationId(null);
      setPendingDeleteId(null);
      setSearch("");
      setFilters(defaultApplicationFilters);
      setSortKey("deadlineSoonest");
      setToast("Demo data restored.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to reset applications.");
    } finally {
      setResetting(false);
    }
  }

  function openApplication(application: Application) {
    setSelectedApplicationId(application.id);
    recordRecentlyViewed({ id: application.id, type: "Application", label: application.company, detail: application.role, href: "/applications" });
  }

  if ((applicationData.loading && !applications.length) || resumeData.loading) return <WorkspaceSkeleton cards={8} />;
  if (applicationData.error) return <DataErrorState error={applicationData.error} onRetry={() => void applicationData.refresh()} />;
  if (resumeData.error) return <DataErrorState error={resumeData.error} onRetry={() => void resumeData.refresh()} />;

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
          <Button disabled={resetting} onClick={resetDemoData} type="button" variant="ghost">
            <RotateCcw className="size-4" />
            {resetting ? "Resetting..." : "Reset demo data"}
          </Button>
        </div>
      </div>

      {applications.length || hasActiveQuery ? <div className="grid gap-4 xl:grid-cols-4">
        {APPLICATION_STATUSES.map((status) => (
          <ApplicationColumn
            applications={visibleApplications.filter(
              (application) => application.status === status,
            )}
            hasActiveQuery={hasActiveQuery}
            key={status}
            onOpenApplication={openApplication}
            onStatusChange={moveApplication}
            status={status}
          />
        ))}
      </div> : <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><Plus className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">No applications yet</h2><p className="mt-2 text-sm text-slate-500">Add your first opportunity and keep every deadline and follow-up in one place.</p><Button className="mt-5" onClick={() => setFormOpen(true)} variant="primary"><Plus className="size-4" />Add your first application</Button></div>}

      <ApplicationFormModal
        application={editingApplication}
        onClose={() => {
          setFormOpen(false);
          setEditingApplication(null);
        }}
        onSubmit={editingApplication ? updateApplication : createApplication}
        open={formOpen}
        resumeOptions={resumeData.resumes.map((resume) => resume.name)}
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
              <Button onClick={() => void deleteApplication(pendingDelete.id)} type="button" variant="primary">
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast message={toast} />
    </div>
  );
}
