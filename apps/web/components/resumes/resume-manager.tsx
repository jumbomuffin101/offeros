"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, RotateCcw } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { filterResumes, sortResumes, type ResumeSortKey, type ResumeStatusFilter } from "@/lib/resume-utils";
import { loadStoredResumes, resetStoredResumes, saveStoredResumes } from "@/lib/resume-storage";
import { ResumeCard } from "@/components/resumes/resume-card";
import { ResumeDetailDrawer } from "@/components/resumes/resume-detail-drawer";
import { ResumeFilters } from "@/components/resumes/resume-filters";
import { ResumeFormModal, type ResumeFormPayload } from "@/components/resumes/resume-form-modal";
import { ResumeInsights } from "@/components/resumes/resume-insights";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { ESCAPE_EVENT } from "@/lib/action-events";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

const OPEN_UPLOAD_EVENT = "offeros:upload-resume";
const OPEN_UPLOAD_STORAGE_KEY = "offeros:open-upload-resume";

export function ResumeManager({ initialResumes }: { initialResumes: ResumeVersion[] }) {
  const [resumes, setResumes] = useState(initialResumes);
  const [hydrated, setHydrated] = useState(false);
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
      setResumes(loadStoredResumes(initialResumes));
      setHydrated(true);
      if (window.sessionStorage.getItem(OPEN_UPLOAD_STORAGE_KEY)) {
        window.sessionStorage.removeItem(OPEN_UPLOAD_STORAGE_KEY);
        setFormOpen(true);
      }
    });
  }, [initialResumes]);

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

  function createResume(payload: ResumeFormPayload) {
    const now = new Date().toISOString();
    const resume: ResumeVersion = { ...payload, id: `${slugify(payload.name)}-${timestampId(now)}`, createdAt: now, updatedAt: now, lastUpdated: now };
    commitResumes([resume, ...resumes]); setFormOpen(false); setToast("Resume saved");
  }

  function updateResume(payload: ResumeFormPayload) {
    if (!editingResume) return;
    const now = new Date().toISOString();
    commitResumes(resumes.map((resume) => resume.id === editingResume.id ? { ...resume, ...payload, lastUpdated: now, updatedAt: now } : resume));
    setEditingResume(null); setFormOpen(false); setToast("Resume updated");
  }

  function duplicateResume(resume: ResumeVersion) {
    const now = new Date().toISOString();
    const duplicate: ResumeVersion = { ...resume, id: `${slugify(resume.name)}-copy-${timestampId(now)}`, name: `${resume.name} Copy`, status: "Draft", applicationsUsed: 0, createdAt: now, updatedAt: now, lastUpdated: now };
    commitResumes([duplicate, ...resumes]); setSelectedId(duplicate.id); setToast("Draft copy created.");
  }

  function toggleStatus(resume: ResumeVersion) {
    const now = new Date().toISOString();
    commitResumes(resumes.map((item) => item.id === resume.id ? { ...item, status: item.status === "Active" ? "Draft" : "Active", updatedAt: now, lastUpdated: now } : item));
    setToast(resume.status === "Active" ? "Resume marked as draft." : "Resume marked active.");
  }

  function deleteResume(resume: ResumeVersion) {
    if (resumes.length <= 1) { setPendingDelete(null); setToast("Keep at least one resume version in your library."); return; }
    commitResumes(resumes.filter((item) => item.id !== resume.id)); setSelectedId(null); setPendingDelete(null); setToast("Deleted successfully");
  }

  function resetDemoData() {
    setResumes(resetStoredResumes(initialResumes)); setSearch(""); setStatus("All"); setSort("updated"); setSelectedId(null); setToast("Resume demo data restored.");
  }

  function commitResumes(next: ResumeVersion[]) {
    setResumes(next);
    if (hydrated) saveStoredResumes(next);
  }

  function openResume(resume: ResumeVersion) {
    setSelectedId(resume.id);
    recordRecentlyViewed({ id: resume.id, type: "Resume", label: resume.name, detail: resume.targetRole, href: "/resumes" });
  }

  if (!hydrated) return <WorkspaceSkeleton cards={6} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex-1"><ResumeFilters counts={counts} search={search} sort={sort} status={status} onSearch={setSearch} onSort={setSort} onStatus={setStatus} /></div>
        <div className="flex gap-2"><Button onClick={() => { setEditingResume(null); setFormOpen(true); }} variant="primary"><FilePlus2 className="size-4" />Upload resume</Button><Button onClick={resetDemoData} variant="ghost"><RotateCcw className="size-4" />Reset demo data</Button></div>
      </div>
      {visible.length ? <div className="grid gap-5 lg:grid-cols-2">{visible.map((resume) => <ResumeCard key={resume.id} resume={resume} onOpen={() => openResume(resume)} onDuplicate={() => duplicateResume(resume)} />)}</div> : <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><FilePlus2 className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">{resumes.length ? "No matching resumes" : "No resumes yet"}</h2><p className="mt-2 text-sm text-slate-500">{resumes.length ? "Adjust your search or filters to see another version." : "Create your first targeted resume version and track where it performs."}</p><Button className="mt-5" onClick={() => { setEditingResume(null); setFormOpen(true); }} variant="primary">{resumes.length ? "Create another resume" : "Create your first resume"}</Button></div>}
      {resumes.length ? <ResumeInsights resumes={resumes} /> : null}
      <ResumeFormModal open={formOpen} resume={editingResume} onClose={() => { setFormOpen(false); setEditingResume(null); }} onSubmit={editingResume ? updateResume : createResume} />
      <ResumeDetailDrawer resume={selected} onClose={() => setSelectedId(null)} onDelete={setPendingDelete} onDuplicate={duplicateResume} onEdit={(resume) => { setEditingResume(resume); setFormOpen(true); }} onToggleStatus={toggleStatus} />
      {pendingDelete ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-xl"><div className="glass-card page-enter w-full max-w-md rounded-3xl p-6" role="alertdialog" aria-modal="true"><h2 className="text-xl font-semibold text-white">Delete resume version?</h2><p className="mt-2 text-sm leading-6 text-slate-400">{resumes.length <= 1 ? "This is your final resume version and cannot be deleted. Reset demo data or create another version first." : `This removes ${pendingDelete.name} from your local resume library.`}</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button onClick={() => setPendingDelete(null)} variant="ghost">Cancel</Button><Button className="text-rose-100" disabled={resumes.length <= 1} onClick={() => deleteResume(pendingDelete)} variant="primary">Delete</Button></div></div></div> : null}
      <Toast message={toast} />
    </div>
  );
}

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function timestampId(value: string) { return value.replace(/[^0-9]/g, ""); }
