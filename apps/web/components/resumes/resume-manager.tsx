"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2 } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { filterResumes, sortResumes, type ResumeSortKey, type ResumeStatusFilter } from "@/lib/resume-utils";
import { useResumes } from "@/hooks/use-resumes";
import { ResumeCard } from "@/components/resumes/resume-card";
import { ResumeDetailDrawer } from "@/components/resumes/resume-detail-drawer";
import { ResumeFilters } from "@/components/resumes/resume-filters";
import { ResumeFormModal, type ResumeFormPayload } from "@/components/resumes/resume-form-modal";
import { ResumeInsights } from "@/components/resumes/resume-insights";
import { ResumeAnalysisPlaceholder } from "@/components/resumes/resume-analysis-placeholder";
import { Button } from "@/components/ui/button";
import { DataErrorState } from "@/components/ui/data-error-state";
import { Toast } from "@/components/ui/toast";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { ESCAPE_EVENT } from "@/lib/action-events";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

const OPEN_UPLOAD_EVENT = "offeros:upload-resume";
const OPEN_UPLOAD_STORAGE_KEY = "offeros:open-upload-resume";

export function ResumeManager() {
  const resumeData = useResumes();
  const resumes = resumeData.resumes;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ResumeStatusFilter>("All");
  const [sort, setSort] = useState<ResumeSortKey>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingResume, setEditingResume] = useState<ResumeVersion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResumeVersion | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    window.queueMicrotask(() => {
      if (window.sessionStorage.getItem(OPEN_UPLOAD_STORAGE_KEY)) {
        window.sessionStorage.removeItem(OPEN_UPLOAD_STORAGE_KEY);
        setFormOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    function openUpload() { window.sessionStorage.removeItem(OPEN_UPLOAD_STORAGE_KEY); setEditingResume(null); setFormOpen(true); }
    window.addEventListener(OPEN_UPLOAD_EVENT, openUpload);
    return () => window.removeEventListener(OPEN_UPLOAD_EVENT, openUpload);
  }, []);
  useEffect(() => {
    function closeOverlays() { setFormOpen(false); setEditingResume(null); setSelectedId(null); setPendingDelete(null); }
    window.addEventListener(ESCAPE_EVENT, closeOverlays);
    return () => window.removeEventListener(ESCAPE_EVENT, closeOverlays);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => sortResumes(filterResumes(resumes, search, status), sort), [resumes, search, status, sort]);
  const selected = resumes.find((resume) => resume.id === selectedId) ?? null;
  const counts: Record<ResumeStatusFilter, number> = { All: resumes.length, Active: resumes.filter((resume) => resume.status === "Active").length, Draft: resumes.filter((resume) => resume.status === "Draft").length };

  async function createResume(payload: ResumeFormPayload) {
    try { await resumeData.create(payload); setFormOpen(false); setToast("Resume saved"); }
    catch { /* Hook exposes the typed error state. */ }
  }

  async function updateResume(payload: ResumeFormPayload) {
    if (!editingResume) return;
    try { await resumeData.update(editingResume.id, payload); setEditingResume(null); setFormOpen(false); setToast("Resume updated"); }
    catch { /* Hook exposes the typed error state. */ }
  }

  async function duplicateResume(resume: ResumeVersion) {
    try { const duplicate = await resumeData.duplicate(resume.id); setSelectedId(duplicate.id); setToast("Draft copy created."); }
    catch { /* Hook exposes the typed error state. */ }
  }

  async function toggleStatus(resume: ResumeVersion) {
    try { await resumeData.toggleStatus(resume); setToast(resume.status === "Active" ? "Resume marked as draft." : "Resume marked active."); }
    catch { /* Hook exposes the typed error state. */ }
  }

  async function deleteResume(resume: ResumeVersion) {
    if (resumes.length <= 1) { setPendingDelete(null); setToast("Keep at least one resume version in your library."); return; }
    try { await resumeData.delete(resume.id); setSelectedId(null); setPendingDelete(null); setToast("Deleted successfully"); }
    catch { /* Hook exposes the typed error state. */ }
  }

  function openResume(resume: ResumeVersion) {
    setSelectedId(resume.id);
    recordRecentlyViewed({ id: resume.id, type: "Resume", label: resume.name, detail: resume.targetRole, href: "/resumes" });
  }

  if (resumeData.loading && !resumes.length) return <WorkspaceSkeleton cards={6} />;
  if (resumeData.error) return <DataErrorState error={resumeData.error} onRetry={() => void resumeData.refresh()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex-1"><ResumeFilters counts={counts} search={search} sort={sort} status={status} onSearch={setSearch} onSort={setSort} onStatus={setStatus} /></div>
        <div className="flex gap-2"><Button onClick={() => { setEditingResume(null); setFormOpen(true); }} variant="primary"><FilePlus2 className="size-4" />Add resume</Button></div>
      </div>
      <ResumeAnalysisPlaceholder />
      {visible.length ? <div className="grid gap-5 lg:grid-cols-2">{visible.map((resume) => <ResumeCard key={resume.id} resume={resume} onOpen={() => openResume(resume)} onDuplicate={() => duplicateResume(resume)} />)}</div> : <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><FilePlus2 className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">{resumes.length ? "No matching resumes" : "No resumes yet"}</h2><p className="mt-2 text-sm text-slate-500">{resumes.length ? "Adjust your search or filters to see another version." : "Create your first targeted resume version and track where it performs."}</p><Button className="mt-5" onClick={() => { setEditingResume(null); setFormOpen(true); }} variant="primary">{resumes.length ? "Create another resume" : "Create your first resume"}</Button></div>}
      {resumes.length ? <ResumeInsights resumes={resumes} /> : null}
      <ResumeFormModal open={formOpen} resume={editingResume} onClose={() => { setFormOpen(false); setEditingResume(null); }} onSubmit={editingResume ? updateResume : createResume} />
      <ResumeDetailDrawer resume={selected} onClose={() => setSelectedId(null)} onDelete={setPendingDelete} onDuplicate={(resume) => void duplicateResume(resume)} onEdit={(resume) => { setEditingResume(resume); setFormOpen(true); }} onToggleStatus={(resume) => void toggleStatus(resume)} onAnalyze={resumeData.analyzeResume} onDeleteAnalysis={resumeData.deleteResumeAnalysis} onListAnalyses={resumeData.listResumeAnalyses} onUpdateResumeText={resumeData.updateResumeText} />
      {pendingDelete ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-xl"><div className="glass-card page-enter w-full max-w-md rounded-3xl p-6" role="alertdialog" aria-modal="true"><h2 className="text-xl font-semibold text-white">Delete resume version?</h2><p className="mt-2 text-sm leading-6 text-slate-400">{resumes.length <= 1 ? "This is your final resume version. Create another version before deleting it." : `This removes ${pendingDelete.name} from your resume library.`}</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button onClick={() => setPendingDelete(null)} variant="ghost">Cancel</Button><Button className="text-rose-100" disabled={resumes.length <= 1} onClick={() => void deleteResume(pendingDelete)} variant="primary">Delete</Button></div></div></div> : null}
      <Toast message={toast} />
    </div>
  );
}
