"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, ExternalLink, Loader2, Save, X } from "lucide-react";
import type { Application, ResumeAnalysis, ResumeVersion } from "@/lib/types";
import type { ApplicationAnalyzeResult, ApplicationInput } from "@/lib/data/types";
import { formatDate, parseTags } from "@/lib/application-utils";
import { AnalysisResult } from "@/components/resumes/resume-analysis-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/data/api/apiClient";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";
import { ApplicationTimeline } from "@/components/applications/application-timeline";
import { ApplicationCopilot } from "@/components/applications/application-copilot";
import {
  ApplicationWorkspaceForm,
  draftFromApplication,
  type ApplicationWorkspaceDraft,
} from "@/components/applications/application-workspace-form";

type PrepPlan = { plan: { status: string; coding: { priority_topics?: Array<{ topic: string; priority: string; reason: string }> }; behavioral: { focus_areas?: Array<{ category: string }> }; system_design: { focus_areas?: Array<{ topic: string }> }; overall_preparation_summary: string; next_best_action: string }; coding_readiness: number; behavioral_readiness: number; system_design_readiness: number; overall_readiness: number; coding_coverage: Array<{ topic: string; practiced: number; status: string }> };

export function ApplicationDetailDrawer({
  application,
  resumes,
  onClose,
  onDelete,
  onSave,
  onAnalyze,
  onGetAnalysis,
  onEventsChanged,
}: {
  application: Application | null;
  resumes: ResumeVersion[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (id: string, input: Partial<ApplicationInput>) => Promise<Application>;
  onAnalyze: (application: Application) => Promise<ApplicationAnalyzeResult>;
  onGetAnalysis: (id: string) => Promise<ResumeAnalysis | null>;
  onEventsChanged: () => void;
}) {
  if (!application) return null;
  return (
    <ApplicationWorkspace
      application={application}
      key={application.id}
      onAnalyze={onAnalyze}
      onClose={onClose}
      onDelete={onDelete}
      onEventsChanged={onEventsChanged}
      onGetAnalysis={onGetAnalysis}
      onSave={onSave}
      resumes={resumes}
    />
  );
}

function ApplicationWorkspace({
  application,
  resumes,
  onClose,
  onDelete,
  onSave,
  onAnalyze,
  onGetAnalysis,
  onEventsChanged,
}: {
  application: Application;
  resumes: ResumeVersion[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (id: string, input: Partial<ApplicationInput>) => Promise<Application>;
  onAnalyze: (application: Application) => Promise<ApplicationAnalyzeResult>;
  onGetAnalysis: (id: string) => Promise<ResumeAnalysis | null>;
  onEventsChanged: () => void;
}) {
  const [draft, setDraft] = useState(() => draftFromApplication(application));
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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

  useEffect(() => {
    if (dataMode !== "api") return;
    let active = true;
    void apiClient.get<{ data: PrepPlan | null }>(`/applications/${application.id}/prep-plan`).then((result) => {
      if (active) setPrepPlan(result.data);
    }).catch(() => {});
    return () => { active = false; };
  }, [application.id]);

  const selectedResume = resumes.find((resume) => resume.id === draft.resumeVersionId) ?? null;
  const analyzed = application.analysisStatus === "completed" && Boolean(application.resumeAnalysisId);

  function updateDraft<K extends keyof ApplicationWorkspaceDraft>(
    key: K,
    value: ApplicationWorkspaceDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setConfirmDiscard(false);
  }

  async function saveWorkspace() {
    if (!draft.company.trim() || !draft.role.trim()) {
      setError("Company and role are required.");
      throw new Error("Company and role are required.");
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await onSave(application.id, {
        company: draft.company.trim(),
        role: draft.role.trim(),
        location: draft.location.trim(),
        status: draft.status,
        dateApplied: draft.dateApplied,
        deadline: draft.deadline,
        source: draft.source.trim(),
        salaryRange: draft.salaryRange.trim(),
        recruiterName: draft.recruiterName.trim(),
        recruiterEmail: draft.recruiterEmail.trim(),
        jobUrl: draft.jobUrl.trim(),
        jobDescription: draft.jobDescription.trim(),
        resumeVersionId: selectedResume?.id ?? "",
        resumeUsed: selectedResume?.name ?? "",
        priority: draft.priority,
        tags: parseTags(draft.tags),
        notes: draft.notes.trim(),
      });
      setDirty(false);
      setMessage("Application changes saved.");
      return saved;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save application details.");
      throw cause;
    } finally {
      setSaving(false);
    }
  }

  async function analyzeResume() {
    if (!selectedResume) { setError("Select a saved resume before analyzing this application."); return; }
    if (!draft.jobDescription.trim()) { setError("Add a job description before analyzing this application."); return; }
    setAnalyzing(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveWorkspace();
      const result = await onAnalyze(saved);
      setAnalysis(result.analysis);
      setMessage("Resume analysis completed for this application.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze this resume for the application.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generatePrepPlan() {
    setGeneratingPlan(true);
    setError("");
    try {
      if (dirty) await saveWorkspace();
      const result = await apiClient.post<{ data: PrepPlan }>(`/applications/${application.id}/prep-plan/generate`, {});
      setPrepPlan(result.data);
      setMessage("Interview prep plan generated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate the prep plan.");
    } finally {
      setGeneratingPlan(false);
    }
  }

  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  const contextSources = [
    "Application details",
    ...(draft.jobDescription.trim() ? ["Job description"] : []),
    ...(selectedResume ? ["Selected resume"] : []),
    ...(analysis ? ["Resume analysis"] : []),
    ...(prepPlan ? ["Prep plan"] : []),
  ];

  return (
    <div className="fixed inset-y-0 right-0 left-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/78 p-2 backdrop-blur-xl sm:p-4 lg:left-80" role="dialog" aria-modal="true" aria-labelledby="application-workspace-title">
      <div className="flex h-[calc(100dvh-1rem)] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-slate-700/45 bg-[#1b1d2b] shadow-2xl shadow-black/35 sm:h-[calc(100dvh-2rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-700/45 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="cyan">{draft.status}</Badge>
              <Badge tone={analyzed ? "green" : "slate"}>{analyzed ? `${application.analysisOverallScore ?? 0}% resume match` : "Not analyzed"}</Badge>
              {dirty ? <Badge tone="amber">Unsaved changes</Badge> : null}
            </div>
            <h2 className="truncate text-xl font-semibold text-white" id="application-workspace-title">{draft.company}</h2>
            <p className="mt-1 text-sm text-slate-400">{draft.role}{draft.location ? ` - ${draft.location}` : ""}</p>
          </div>
          <Button aria-label="Close application workspace" disabled={saving || analyzing} onClick={requestClose} variant="ghost"><X className="size-4" />Close</Button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
            <div className="min-w-0 space-y-5">
              <ApplicationWorkspaceForm draft={draft} onChange={updateDraft} resumes={resumes} />
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={saving || analyzing} onClick={() => void saveWorkspace()} variant="primary">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button disabled={saving || analyzing || !selectedResume || !draft.jobDescription.trim()} onClick={() => void analyzeResume()} variant="secondary">
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
                  {analyzing ? "Analyzing resume..." : "Analyze resume for this role"}
                </Button>
                {draft.jobUrl ? <a className="inline-flex items-center gap-2 px-2 text-sm text-indigo-200 hover:text-indigo-100" href={draft.jobUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open job posting</a> : null}
              </div>
              {error ? <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">{error}</div> : null}
              {message ? <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100">{message}</div> : null}
              <ApplicationTimeline application={application} onChanged={onEventsChanged} />
              {analysis ? <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4 sm:p-5"><h3 className="mb-4 font-semibold text-white">Application-specific resume analysis</h3><AnalysisResult analysis={analysis} /></section> : null}
            </div>

            <aside className="min-w-0 space-y-5">
              <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4">
                <div className="text-xs font-medium uppercase text-indigo-200/70">Next action</div>
                <div className="mt-2 text-lg font-semibold text-white">{application.nextAction || "No upcoming action"}</div>
                {application.nextActionDueAt ? <p className="mt-1 text-sm text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.nextActionDueAt))}</p> : <p className="mt-1 text-sm text-slate-500">Add an event to define the next recruiting commitment.</p>}
              </section>

              <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4">
                <div className="text-xs font-medium uppercase text-indigo-200/70">Resume intelligence</div>
                {analyzed ? <>
                  <div className="mt-2 text-3xl font-semibold text-white">{application.analysisOverallScore ?? 0}%</div>
                  <p className="mt-1 text-sm text-slate-400">Overall fit for this role</p>
                  <div className="mt-4 space-y-3"><Metric label="Keyword coverage" value={application.analysisKeywordScore ?? 0} /><Metric label="Technical depth" value={analysis?.technicalDepthScore ?? 0} /><Metric label="Experience match" value={analysis?.experienceMatchScore ?? 0} /></div>
                  <p className="mt-4 text-xs text-slate-500">Last analyzed {formatDate(application.analysisLastAnalyzedAt ?? "")}. {application.analysisMissingKeywordCount ?? 0} missing keywords.</p>
                </> : <p className="mt-2 text-sm leading-6 text-slate-400">Select a saved resume and add the job description to see role-specific fit, keyword gaps, and recommendations.</p>}
              </section>

              <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="text-xs font-medium uppercase text-indigo-200/70">Prep plan</div><h3 className="mt-1 font-semibold text-white">Interview preparation</h3></div>
                  <Button disabled={generatingPlan || dataMode !== "api" || !draft.jobDescription.trim()} onClick={() => void generatePrepPlan()} variant="primary">{generatingPlan ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}{prepPlan ? "Regenerate" : "Generate plan"}</Button>
                </div>
                {prepPlan ? <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-slate-700/35 bg-slate-950/20 p-3"><div className="text-xs text-slate-500">Heuristic preparation readiness</div><div className="mt-1 text-3xl font-semibold text-white">{prepPlan.overall_readiness}%</div><Progress value={prepPlan.overall_readiness} tone={prepPlan.overall_readiness >= 70 ? "green" : "amber"} /></div>
                  <p className="text-sm leading-6 text-slate-300">{prepPlan.plan.overall_preparation_summary}</p>
                  <div><div className="text-xs font-medium uppercase text-slate-500">Top next action</div><p className="mt-1 text-sm font-medium text-indigo-100">{prepPlan.plan.next_best_action}</p></div>
                </div> : <p className="mt-3 text-sm leading-6 text-slate-400">Generate interview prep guidance from this role, resume match, and recorded practice.</p>}
                {dataMode !== "api" ? <p className="mt-3 text-xs text-slate-500">Application prep plans are available in cloud API mode.</p> : null}
              </section>

              <ApplicationCopilot
                applicationId={application.id}
                defaultContextSources={contextSources}
                onBeforeSend={dirty ? saveWorkspace : undefined}
              />
            </aside>
          </div>
        </main>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-700/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          {confirmDiscard ? (
            <div className="flex flex-1 flex-wrap items-center gap-2 text-sm text-amber-100">
              Discard unsaved changes?
              <Button onClick={() => setConfirmDiscard(false)} variant="ghost">Keep editing</Button>
              <Button onClick={onClose} variant="secondary">Discard and close</Button>
            </div>
          ) : <Button className="text-rose-200 hover:bg-rose-400/10 hover:text-rose-100" onClick={() => onDelete(application.id)} variant="ghost">Delete application</Button>}
          {!confirmDiscard ? <Button onClick={requestClose} variant="secondary">Done</Button> : null}
        </footer>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-100">{value}%</span></div><Progress value={value} tone={value >= 75 ? "green" : value >= 50 ? "cyan" : "amber"} /></div>;
}
