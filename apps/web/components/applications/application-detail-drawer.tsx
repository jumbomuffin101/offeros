"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, ExternalLink, Loader2, Save, X } from "lucide-react";
import type { Application, ApplicationStatus, ResumeAnalysis, ResumeVersion } from "@/lib/types";
import type { ApplicationAnalyzeResult, ApplicationInput } from "@/lib/data/types";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import { formatDate } from "@/lib/application-utils";
import { AnalysisResult } from "@/components/resumes/resume-analysis-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/data/api/apiClient";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";

type PrepPlan = { plan: { status: string; coding: { priority_topics?: Array<{ topic: string; priority: string; reason: string }> }; behavioral: { focus_areas?: Array<{ category: string }> }; system_design: { focus_areas?: Array<{ topic: string }> }; overall_preparation_summary: string; next_best_action: string }; coding_readiness: number; behavioral_readiness: number; system_design_readiness: number; overall_readiness: number; coding_coverage: Array<{ topic: string; practiced: number; status: string }> };

export function ApplicationDetailDrawer({
  application,
  resumes,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onSave,
  onAnalyze,
  onGetAnalysis,
}: {
  application: Application | null;
  resumes: ResumeVersion[];
  onClose: () => void;
  onEdit: (application: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onSave: (id: string, input: Partial<ApplicationInput>) => Promise<Application>;
  onAnalyze: (application: Application) => Promise<ApplicationAnalyzeResult>;
  onGetAnalysis: (id: string) => Promise<ResumeAnalysis | null>;
}) {
  if (!application) return null;
  return <ApplicationWorkspace key={`${application.id}-${application.updatedAt}`} application={application} resumes={resumes} onClose={onClose} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onSave={onSave} onAnalyze={onAnalyze} onGetAnalysis={onGetAnalysis} />;
}

function ApplicationWorkspace({
  application,
  resumes,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onSave,
  onAnalyze,
  onGetAnalysis,
}: {
  application: Application;
  resumes: ResumeVersion[];
  onClose: () => void;
  onEdit: (application: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onSave: (id: string, input: Partial<ApplicationInput>) => Promise<Application>;
  onAnalyze: (application: Application) => Promise<ApplicationAnalyzeResult>;
  onGetAnalysis: (id: string) => Promise<ResumeAnalysis | null>;
}) {
  const [jobDescription, setJobDescription] = useState(application.jobDescription ?? "");
  const [resumeId, setResumeId] = useState(application.resumeVersionId ?? "");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [prepPlan, setPrepPlan] = useState<PrepPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    if (!application.resumeAnalysisId) return;
    let active = true;
    void onGetAnalysis(application.resumeAnalysisId).then((result) => {
      if (active) setAnalysis(result);
    }).catch(() => {
      if (active) setError("The saved analysis could not be loaded. Run analysis again if needed.");
    });
    return () => { active = false; };
  }, [application.resumeAnalysisId, onGetAnalysis]);
  useEffect(() => { if (dataMode !== "api") return; let active = true; void apiClient.get<{ data: PrepPlan | null }>(`/applications/${application.id}/prep-plan`).then((result) => { if (active) setPrepPlan(result.data); }).catch(() => {}); return () => { active = false; }; }, [application.id]);
  const selectedResume = resumes.find((resume) => resume.id === resumeId) ?? null;
  const analyzed = application.analysisStatus === "completed" && Boolean(application.resumeAnalysisId);

  async function saveWorkspace() {
    setSaving(true); setError(""); setMessage("");
    try {
      await onSave(application.id, {
        resumeVersionId: selectedResume?.id ?? "",
        resumeUsed: selectedResume?.name ?? "",
        jobDescription: jobDescription.trim(),
      });
      setMessage("Application workspace saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save application details.");
    } finally { setSaving(false); }
  }

  async function analyzeResume() {
    if (!selectedResume) { setError("Select a saved resume before analyzing this application."); return; }
    if (!jobDescription.trim()) { setError("Add a job description before analyzing this application."); return; }
    setAnalyzing(true); setError(""); setMessage("");
    try {
      const saved = await onSave(application.id, {
        resumeVersionId: selectedResume.id,
        resumeUsed: selectedResume.name,
        jobDescription: jobDescription.trim(),
      });
      const result = await onAnalyze(saved);
      setAnalysis(result.analysis);
      setMessage("Resume analysis completed for this application.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze this resume for the application.");
    } finally { setAnalyzing(false); }
  }
  async function generatePrepPlan() { setGeneratingPlan(true); setError(""); try { const result = await apiClient.post<{ data: PrepPlan }>(`/applications/${application.id}/prep-plan/generate`, {}); setPrepPlan(result.data); setMessage("Interview prep plan generated."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to generate the prep plan."); } finally { setGeneratingPlan(false); } }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/78 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="application-workspace-title">
      <div className="flex h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700/45 bg-[#1b1d2b] shadow-2xl shadow-black/35 sm:h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-700/45 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2"><Badge tone="cyan">{application.status}</Badge><Badge tone={analyzed ? "green" : "slate"}>{analyzed ? `${application.analysisOverallScore ?? 0}% resume match` : "Not analyzed"}</Badge></div>
            <h2 className="truncate text-xl font-semibold text-white" id="application-workspace-title">{application.company}</h2>
            <p className="mt-1 text-sm text-slate-400">{application.role}{application.location ? ` - ${application.location}` : ""}</p>
          </div>
          <Button aria-label="Close application workspace" onClick={onClose} variant="ghost"><X className="size-4" />Close</Button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-white">Application overview</h3><select className="h-9 rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 text-sm text-slate-100" onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)} value={application.status}>{APPLICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
                <div className="grid gap-3 text-sm sm:grid-cols-2"><Detail label="Applied" value={formatDate(application.dateApplied)} /><Detail label="Deadline" value={formatDate(application.deadline)} /><Detail label="Source" value={application.source || "Not set"} /><Detail label="Recruiter" value={application.recruiterName || "Not set"} /><Detail label="Salary" value={application.salaryRange || "Not set"} /><Detail label="Resume" value={selectedResume?.name || application.resumeUsed || "Not selected"} /></div>
                {application.jobUrl ? <a className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-indigo-100" href={application.jobUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open job posting</a> : null}
              </section>

              <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4">
                <h3 className="font-semibold text-white">Resume and job description</h3>
                <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium text-slate-500">Saved resume</span><select className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 text-sm text-slate-100" onChange={(event) => setResumeId(event.target.value)} value={resumeId}><option value="">Select a saved resume</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name} - {resume.targetRole}</option>)}</select></label>
                {!resumes.length ? <p className="mt-2 text-sm text-amber-100/80">Add a resume in Resume Manager before running an application analysis.</p> : null}
                <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium text-slate-500">Job description</span><textarea className="min-h-52 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-300/15" onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the full job description and requirements." value={jobDescription} /></label>
                <div className="mt-3 flex flex-wrap gap-2"><Button disabled={saving || analyzing} onClick={() => void saveWorkspace()} variant="secondary">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving..." : "Save workspace"}</Button><Button disabled={saving || analyzing || !selectedResume || !jobDescription.trim()} onClick={() => void analyzeResume()} variant="primary">{analyzing ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}{analyzing ? "Analyzing resume..." : "Analyze resume for this role"}</Button></div>
              </section>

              <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4"><h3 className="font-semibold text-white">Notes</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{application.notes || "No notes yet."}</p><Button className="mt-3" onClick={() => onEdit(application)} variant="ghost">Edit application details</Button></section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4"><div className="text-xs font-medium uppercase text-indigo-200/70">Resume intelligence</div>{analyzed ? <><div className="mt-2 text-3xl font-semibold text-white">{application.analysisOverallScore ?? 0}%</div><p className="mt-1 text-sm text-slate-400">Overall fit for this role</p><div className="mt-4 space-y-3"><Metric label="Keyword coverage" value={application.analysisKeywordScore ?? 0} /><Metric label="Technical depth" value={analysis?.technicalDepthScore ?? 0} /><Metric label="Experience match" value={analysis?.experienceMatchScore ?? 0} /></div><p className="mt-4 text-xs text-slate-500">Last analyzed {formatDate(application.analysisLastAnalyzedAt ?? "")}. {application.analysisMissingKeywordCount ?? 0} missing keywords.</p></> : <p className="mt-2 text-sm leading-6 text-slate-400">Select a saved resume and add the job description to see role-specific fit, keyword gaps, and recommendations.</p>}</section>
              {error ? <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">{error}</div> : null}{message ? <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100">{message}</div> : null}
              {analysis ? <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4"><h3 className="mb-4 font-semibold text-white">Application-specific analysis</h3><AnalysisResult analysis={analysis} /></section> : null}
              <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-medium uppercase text-indigo-200/70">Prep plan</div><h3 className="mt-1 font-semibold text-white">Interview preparation</h3></div><Button disabled={generatingPlan || dataMode !== "api" || !jobDescription.trim()} onClick={() => void generatePrepPlan()} variant="primary">{generatingPlan ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}{prepPlan ? "Regenerate" : "Generate plan"}</Button></div>{prepPlan ? <div className="mt-4 space-y-4"><div className="rounded-lg border border-slate-700/35 bg-slate-950/20 p-3"><div className="text-xs text-slate-500">Heuristic preparation readiness</div><div className="mt-1 text-3xl font-semibold text-white">{prepPlan.overall_readiness}%</div><Progress value={prepPlan.overall_readiness} tone={prepPlan.overall_readiness >= 70 ? "green" : "amber"} /></div><p className="text-sm leading-6 text-slate-300">{prepPlan.plan.overall_preparation_summary}</p><div><div className="text-xs font-medium uppercase text-slate-500">Top next action</div><p className="mt-1 text-sm font-medium text-indigo-100">{prepPlan.plan.next_best_action}</p></div><div className="space-y-2">{prepPlan.coding_coverage.map((item) => <div className="flex items-center justify-between text-sm" key={item.topic}><span className="text-slate-300">{item.topic}</span><span className={item.status === "covered" ? "text-emerald-200" : "text-amber-200"}>{item.practiced} practiced - {item.status === "covered" ? "Covered" : "Needs work"}</span></div>)}</div></div> : <p className="mt-3 text-sm leading-6 text-slate-400">Generate interview prep guidance from this job description, resume match, and your recorded coding, behavioral, and system design practice.</p>}{dataMode !== "api" ? <p className="mt-3 text-xs text-slate-500">Application prep plans are available in cloud API mode.</p> : null}</section>
            </aside>
          </div>
        </main>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-700/45 px-5 py-4 sm:flex-row sm:justify-between sm:px-7"><Button className="text-rose-200 hover:bg-rose-400/10 hover:text-rose-100" onClick={() => onDelete(application.id)} variant="ghost">Delete application</Button><Button onClick={onClose} variant="secondary">Done</Button></footer>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-200">{value}</div></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-100">{value}%</span></div><Progress value={value} tone={value >= 75 ? "green" : value >= 50 ? "cyan" : "amber"} /></div>; }
