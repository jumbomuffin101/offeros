"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanSquare, List, Plus } from "lucide-react";
import { ApplicationColumn } from "@/components/applications/application-column";
import { ApplicationDetailDrawer } from "@/components/applications/application-detail-drawer";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { ApplicationList } from "@/components/applications/application-list";
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
import { dataMode } from "@/lib/data/repositories/repositoryFactory";
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
import type { Application, ApplicationPriority, ApplicationStatus } from "@/lib/types";
import type { ApplicationAnalyzeResult, ApplicationInput } from "@/lib/data/types";

const OPEN_ADD_EVENT = "offeros:add-application";
const OPEN_ADD_STORAGE_KEY = "offeros:open-add-application";
type ApplicationView = "list" | "kanban";
type VolumeFilter = "all" | "active" | "followup" | "deadline" | "interviews";

const volumeFilters: Array<{ label: string; value: VolumeFilter }> = [
  { label: "All tracked", value: "all" },
  { label: "Active only", value: "active" },
  { label: "Needs follow-up", value: "followup" },
  { label: "Has deadline", value: "deadline" },
  { label: "OA/interviews", value: "interviews" },
];

export function ApplicationBoard() {
  const applicationData = useApplications();
  const resumeData = useResumes();
  const applications = applicationData.applications;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ApplicationFiltersState>(defaultApplicationFilters);
  const [sortKey, setSortKey] = useState<ApplicationSortKey>("deadlineSoonest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<ApplicationView>("list");
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>("all");
  const [hideRejected, setHideRejected] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

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

  useEffect(() => {
    if (selectedApplicationId || !applications.length) return;
    const requestedId = new URLSearchParams(window.location.search).get("open");
    if (requestedId && applications.some((application) => application.id === requestedId)) window.queueMicrotask(() => setSelectedApplicationId(requestedId));
  }, [applications, selectedApplicationId]);

  const visibleApplications = useMemo(
    () => sortApplications(applyVolumeFilters(filterApplications(applications, search, filters), volumeFilter, hideRejected), sortKey),
    [applications, filters, hideRejected, search, sortKey, volumeFilter],
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

  async function changePriority(id: string, priority: ApplicationPriority) {
    try {
      await applicationData.update(id, { priority });
      setToast(`Priority set to ${priority}.`);
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

  async function saveApplicationWorkspace(id: string, input: Partial<ApplicationInput>) {
    const updated = await applicationData.update(id, input);
    setToast("Application workspace saved");
    return updated;
  }

  async function analyzeApplicationResume(application: Application): Promise<ApplicationAnalyzeResult> {
    if (dataMode === "api") {
      const result = await applicationData.analyzeResume(application.id, createRequestId());
      setToast("Resume analysis completed");
      return result;
    }
    const resume = resumeData.resumes.find((item) => item.id === application.resumeVersionId);
    if (!resume) throw new Error("Select a saved resume before analyzing this application.");
    const result = await resumeData.analyzeResume(resume.id, {
      targetRole: application.role,
      companyName: application.company,
      jobDescription: application.jobDescription ?? "",
    });
    const updated = await applicationData.update(application.id, {
      resumeAnalysisId: result.analysis.id,
      analysisStatus: result.analysis.status,
      analysisOverallScore: result.analysis.overallScore,
      analysisKeywordScore: result.analysis.keywordScore,
      analysisMissingKeywordCount: result.analysis.missingKeywords.length,
      analysisLastAnalyzedAt: result.analysis.createdAt,
    });
    setToast("Resume analysis completed");
    return { application: updated, analysis: result.analysis };
  }

  function openApplication(application: Application) {
    setSelectedApplicationId(application.id);
    recordRecentlyViewed({ id: application.id, type: "Application", label: application.company, detail: application.role, href: "/applications" });
  }

  if (applicationData.loading && !applications.length) return <WorkspaceSkeleton cards={8} />;
  if (applicationData.error) return <DataErrorState error={applicationData.error} onRetry={() => void applicationData.refresh()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ApplicationStats applications={applications} />
      </div>

      {resumeData.error ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-slate-300">
          Resume metadata is temporarily unavailable. You can continue tracking applications.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ApplicationFilters
            filterOpen={filterOpen}
            filters={filters}
            onFilterOpenChange={setFilterOpen}
            onFiltersChange={setFilters}
            onResetView={() => { setVolumeFilter("all"); setHideRejected(true); }}
            onSearchChange={setSearch}
            onSortChange={setSortKey}
            onSortOpenChange={setSortOpen}
            resumes={resumeNames}
            search={search}
            sortKey={sortKey}
            sortOpen={sortOpen}
            sources={sources}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {volumeFilters.map((item) => (
              <button
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${volumeFilter === item.value ? "border-indigo-400/35 bg-indigo-400/10 text-indigo-100" : "border-slate-700/35 bg-slate-900/20 text-slate-400 hover:border-slate-600/45 hover:text-slate-100"}`}
                key={item.value}
                onClick={() => setVolumeFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <button
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${hideRejected ? "border-indigo-400/35 bg-indigo-400/10 text-indigo-100" : "border-slate-700/35 bg-slate-900/20 text-slate-400 hover:border-slate-600/45 hover:text-slate-100"}`}
              onClick={() => setHideRejected((value) => !value)}
              type="button"
            >
              {hideRejected ? "Rejected hidden" : "Show rejected"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-slate-700/40 bg-slate-900/25 p-1">
            <button className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${view === "list" ? "bg-indigo-400/15 text-indigo-100" : "text-slate-400 hover:text-slate-100"}`} onClick={() => setView("list")} type="button"><List className="size-4" />List</button>
            <button className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${view === "kanban" ? "bg-indigo-400/15 text-indigo-100" : "text-slate-400 hover:text-slate-100"}`} onClick={() => setView("kanban")} type="button"><KanbanSquare className="size-4" />Kanban</button>
          </div>
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
        </div>
      </div>

      {applications.length || hasActiveQuery || volumeFilter !== "all" || !hideRejected ? (
        view === "list" ? (
          visibleApplications.length ? <ApplicationList applications={visibleApplications} onOpenApplication={openApplication} onPriorityChange={changePriority} onStatusChange={moveApplication} /> : <NoApplicationMatches />
        ) : <div className="grid gap-4 xl:grid-cols-4">
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
      </div>) : <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><Plus className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">No applications yet</h2><p className="mt-2 text-sm text-slate-500">Add your first opportunity and keep every deadline and follow-up in one place.</p><Button className="mt-5" onClick={() => setFormOpen(true)} variant="primary"><Plus className="size-4" />Add your first application</Button></div>}

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
        resumes={resumeData.resumes}
        onClose={() => setSelectedApplicationId(null)}
        onDelete={(id) => setPendingDeleteId(id)}
        onSave={saveApplicationWorkspace}
        onAnalyze={analyzeApplicationResume}
        onGetAnalysis={resumeData.getResumeAnalysis}
        onEventsChanged={() => void applicationData.refresh()}
      />

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-xl">
          <div className="glass-card page-enter w-full max-w-md rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white">Delete application?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This removes {pendingDelete.company} from your tracker. This action cannot be undone.
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

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `application-analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function applyVolumeFilters(applications: Application[], filter: VolumeFilter, hideRejected: boolean) {
  const today = Date.now();
  return applications.filter((application) => {
    if (hideRejected && application.status === "Rejected") return false;
    if (filter === "active") return !["Offer", "Rejected"].includes(application.status);
    if (filter === "deadline") return Boolean(application.deadline);
    if (filter === "interviews") return ["OA", "Interview", "Final Round"].includes(application.status);
    if (filter === "followup") {
      if (["Wishlist", "Offer", "Rejected"].includes(application.status)) return false;
      const updated = new Date(application.updatedAt).getTime();
      return Number.isFinite(updated) && today - updated >= 7 * 86_400_000;
    }
    return true;
  });
}

function NoApplicationMatches() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center">
      <List className="mx-auto size-7 text-indigo-300" />
      <h2 className="mt-4 text-lg font-semibold text-white">No applications match this view</h2>
      <p className="mt-2 text-sm text-slate-500">Adjust search, filters, or the high-volume view controls.</p>
    </div>
  );
}
