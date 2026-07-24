"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileUp,
  Layers3,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLaunchSettings } from "@/hooks/use-launch";
import { applicationRepository, resumeRepository } from "@/lib/data/repositories/repositoryFactory";
import { launchRepository } from "@/lib/data/repositories/launchRepository";
import { announceDataChange } from "@/lib/data/repositories/events";
import type { Application, ResumeVersion } from "@/lib/types";

const steps = ["Welcome", "Resume", "Application", "Analyze fit", "Prep plan", "Finish"];

export function OnboardingModal() {
  const settingsResource = useLaunchSettings();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [resume, setResume] = useState<ResumeVersion | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<Application["status"]>("Wishlist");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const settings = settingsResource.settings;
    if (!settings || settings.onboardingStatus === "completed" || settings.onboardingStatus === "skipped") return;
    window.queueMicrotask(() => {
      setStep(settings.onboardingStep || 1);
      setOpen(true);
    });
    void Promise.all([resumeRepository.list(), applicationRepository.list()]).then(([resumes, applications]) => {
      setResume(resumes[0] ?? null);
      setApplication(applications[0] ?? null);
    });
  }, [settingsResource.settings]);

  useEffect(() => {
    if (open && step > 1) window.setTimeout(() => firstInputRef.current?.focus(), 40);
  }, [open, step]);

  const configured = useMemo(() => [
    Boolean(resume),
    Boolean(application),
    Boolean(application?.resumeAnalysisId),
  ], [application, resume]);

  async function move(nextStep: number) {
    setError("");
    setStep(nextStep);
    await settingsResource.update({
      onboardingStatus: "in_progress",
      onboardingStep: nextStep,
    });
  }

  async function saveResume() {
    if (!resumeName.trim() || !targetRole.trim()) {
      setError("Add a resume name and target role before continuing.");
      firstInputRef.current?.focus();
      return;
    }
    setBusy("Adding resume...");
    setError("");
    try {
      let created = await resumeRepository.create({
        name: resumeName.trim(), targetRole: targetRole.trim(), description: "",
        status: "Active", applicationsUsed: 0, keywordMatchScore: 0, tags: [],
        strengths: [], weaknesses: [], missingKeywords: [], suggestedImprovement: "",
        notes: "", fileName: resumeFile?.name ?? "", originalFileName: resumeFile?.name ?? "",
        extractedText: "", textExtractionStatus: "not_started", textExtractionError: "",
      });
      if (resumeFile && resumeRepository.uploadResumeFile) {
        setBusy("Extracting resume text...");
        created = (await resumeRepository.uploadResumeFile(created.id, resumeFile)).resume;
      }
      setResume(created);
      announceDataChange();
      await move(3);
    } catch (cause) {
      setError(messageFor(cause, "OfferOS could not add this resume. Your selections are preserved."));
    } finally {
      setBusy("");
    }
  }

  async function saveApplication() {
    if (!company.trim() || !role.trim()) {
      setError("Add a company and role before continuing.");
      firstInputRef.current?.focus();
      return;
    }
    setBusy("Adding application...");
    setError("");
    try {
      const created = await applicationRepository.create({
        company: company.trim(), role: role.trim(), location: "", status,
        dateApplied: status === "Applied" ? new Date().toISOString().slice(0, 10) : "",
        deadline: "", source: source.trim(), resumeUsed: resume?.name ?? "",
        resumeVersionId: resume?.id, jobDescription: jobDescription.trim(), jobUrl: "",
        recruiterName: "", recruiterEmail: "", salaryRange: "", priority: "Medium",
        notes: "", tags: [],
      });
      setApplication(created);
      announceDataChange();
      await move(4);
    } catch (cause) {
      setError(messageFor(cause, "OfferOS could not add this application. Your inputs are preserved."));
    } finally {
      setBusy("");
    }
  }

  async function analyzeFit() {
    if (!application || !resume || !application.jobDescription?.trim()) {
      setError("A resume, application, and job description are required for role-specific analysis.");
      return;
    }
    if (!resume.extractedText?.trim()) {
      setError("Resume text is missing. You can add it later from Resume Manager.");
      return;
    }
    if (!applicationRepository.analyzeResume) {
      await move(5);
      return;
    }
    setBusy("Analyzing resume fit...");
    setError("");
    try {
      const result = await applicationRepository.analyzeResume(application.id, crypto.randomUUID());
      setApplication(result.application);
      announceDataChange();
      await move(5);
    } catch (cause) {
      setError(messageFor(cause, "Resume analysis could not be completed. You can retry or continue later."));
    } finally {
      setBusy("");
    }
  }

  async function generatePrepPlan() {
    if (!application) {
      setError("Add an application before creating a prep plan.");
      return;
    }
    setBusy("Creating prep plan...");
    setError("");
    try {
      await launchRepository.generatePrepPlan(application.id);
      announceDataChange();
      await move(6);
    } catch (cause) {
      setError(messageFor(cause, "The prep plan could not be created. You can retry or skip this step."));
    } finally {
      setBusy("");
    }
  }

  async function finish(statusValue: "completed" | "skipped" = "completed") {
    setBusy("Finishing...");
    try {
      await settingsResource.update({
        onboardingStatus: statusValue,
        onboardingStep: statusValue === "completed" ? 6 : step,
      });
      setOpen(false);
      announceDataChange();
    } finally {
      setBusy("");
    }
  }

  if (!open || settingsResource.loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0d0f18]/88 p-3 backdrop-blur-xl sm:p-6">
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700/45 bg-[var(--surface)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <header className="shrink-0 border-b border-slate-700/35 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-400/12 text-indigo-200"><Layers3 className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-indigo-200">Step {step} of 6</p>
              <h1 className="truncate text-lg font-semibold text-white" id="onboarding-title">{steps[step - 1]}</h1>
            </div>
            <Button disabled={Boolean(busy)} onClick={() => { void finish("skipped"); }} variant="ghost">Skip setup</Button>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-1" aria-label="Onboarding progress">
            {steps.map((label, index) => <span aria-label={label} className={`h-1 rounded-full ${index < step ? "bg-indigo-400" : "bg-slate-700/60"}`} key={label} />)}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8">
          {step === 1 ? <Welcome /> : null}
          {step === 2 ? <ResumeStep file={resumeFile} name={resumeName} role={targetRole} inputRef={firstInputRef} onFile={setResumeFile} onName={setResumeName} onRole={setTargetRole} /> : null}
          {step === 3 ? <ApplicationStep company={company} description={jobDescription} role={role} source={source} status={status} inputRef={firstInputRef} onCompany={setCompany} onDescription={setJobDescription} onRole={setRole} onSource={setSource} onStatus={setStatus} /> : null}
          {step === 4 ? <ConditionalStep available={Boolean(resume && application?.jobDescription?.trim())} icon={Sparkles} title="Analyze your fit" ready="Your resume and job description are ready for role-specific analysis." missing="Add resume text and a job description later to unlock role-specific analysis." /> : null}
          {step === 5 ? <ConditionalStep available={Boolean(application)} icon={Target} title="Create a focused prep plan" ready={`Build coding, behavioral, and system design priorities for ${application?.company ?? "this role"}.`} missing="Add an application later to generate a role-specific prep plan." /> : null}
          {step === 6 ? <FinishStep configured={configured} /> : null}
          {error ? <div className="mt-5 rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100" role="alert">{error}</div> : null}
        </div>
        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-700/35 bg-[var(--surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex gap-2">
            {step > 1 ? <Button disabled={Boolean(busy)} onClick={() => void move(step - 1)} variant="ghost"><ArrowLeft className="size-4" />Back</Button> : null}
            {step > 1 && step < 6 ? <Button disabled={Boolean(busy)} onClick={() => { setOpen(false); }} variant="ghost">Continue later</Button> : null}
          </div>
          <div className="flex gap-2 sm:justify-end">
            {step === 1 ? <Button onClick={() => void move(2)} variant="primary">Get started<ArrowRight className="size-4" /></Button> : null}
            {step === 2 ? <><Button disabled={Boolean(busy)} onClick={() => void move(3)} variant="ghost">Skip for now</Button><Button disabled={Boolean(busy)} onClick={() => void saveResume()} variant="primary">{busy || "Add resume"}</Button></> : null}
            {step === 3 ? <><Button disabled={Boolean(busy)} onClick={() => void move(4)} variant="ghost">Skip for now</Button><Button disabled={Boolean(busy)} onClick={() => void saveApplication()} variant="primary">{busy || "Add application"}</Button></> : null}
            {step === 4 ? <><Button disabled={Boolean(busy)} onClick={() => void move(5)} variant="ghost">Skip for now</Button><Button disabled={Boolean(busy) || !resume || !application?.jobDescription?.trim()} onClick={() => void analyzeFit()} variant="primary">{busy || "Analyze fit"}</Button></> : null}
            {step === 5 ? <><Button disabled={Boolean(busy)} onClick={() => void move(6)} variant="ghost">Skip for now</Button><Button disabled={Boolean(busy) || !application} onClick={() => void generatePrepPlan()} variant="primary">{busy || "Create prep plan"}</Button></> : null}
            {step === 6 ? <Button disabled={Boolean(busy)} onClick={() => void finish()} variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Open Today dashboard</Button> : null}
          </div>
        </footer>
      </section>
    </div>
  );
}

function Welcome() {
  return <div className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-semibold text-white">Your technical recruiting command center.</h2><p className="mt-3 text-sm leading-6 text-slate-400">Track applications, improve targeted resumes, prepare for interviews, and keep the next important action visible.</p><div className="mt-8 grid gap-3 text-left sm:grid-cols-3">{[["Applications", "Deadlines and pipeline"], ["Resume intelligence", "Role-specific feedback"], ["Interview prep", "Focused daily practice"]].map(([title, detail]) => <div className="rounded-xl border border-slate-700/40 bg-slate-900/25 p-4" key={title}><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div>)}</div></div>;
}
function ResumeStep({ file, name, role, inputRef, onFile, onName, onRole }: { file: File | null; name: string; role: string; inputRef: React.RefObject<HTMLInputElement | null>; onFile: (value: File | null) => void; onName: (value: string) => void; onRole: (value: string) => void }) {
  return <div className="mx-auto max-w-xl space-y-4"><div><h2 className="text-2xl font-semibold text-white">Add your resume</h2><p className="mt-2 text-sm text-slate-400">Upload a PDF or DOCX to enable role-specific analysis. You can also add resume text later.</p></div><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Resume name</span><Input ref={inputRef} onChange={(event) => onName(event.target.value)} placeholder="General SWE Resume" value={name} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Target role</span><Input onChange={(event) => onRole(event.target.value)} placeholder="Software Engineer" value={role} /></label><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/60 bg-slate-900/25 px-4 text-center focus-within:border-indigo-400/60"><FileUp className="size-5 text-indigo-300" /><span className="mt-2 text-sm font-medium text-slate-200">{file?.name ?? "Choose PDF or DOCX"}</span><span className="mt-1 text-xs text-slate-500">Maximum 5 MB</span><input accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] ?? null; onFile(selected); if (selected && !name) onName(selected.name.replace(/\.(pdf|docx)$/i, "")); }} type="file" /></label></div>;
}
function ApplicationStep({ company, description, role, source, status, inputRef, onCompany, onDescription, onRole, onSource, onStatus }: { company: string; description: string; role: string; source: string; status: Application["status"]; inputRef: React.RefObject<HTMLInputElement | null>; onCompany: (value: string) => void; onDescription: (value: string) => void; onRole: (value: string) => void; onSource: (value: string) => void; onStatus: (value: Application["status"]) => void }) {
  return <div className="mx-auto max-w-2xl space-y-4"><div><h2 className="text-2xl font-semibold text-white">Add your first application</h2><p className="mt-2 text-sm text-slate-400">A job description unlocks resume matching and targeted prep, but it is optional.</p></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-slate-300">Company</span><Input ref={inputRef} onChange={(event) => onCompany(event.target.value)} value={company} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-300">Role</span><Input onChange={(event) => onRole(event.target.value)} value={role} /></label><label><span className="mb-1.5 block text-sm font-medium text-slate-300">Status</span><select className="h-10 w-full rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 text-sm text-slate-200" onChange={(event) => onStatus(event.target.value as Application["status"])} value={status}><option>Wishlist</option><option>Applying</option><option>Applied</option></select></label><label><span className="mb-1.5 block text-sm font-medium text-slate-300">Source</span><Input onChange={(event) => onSource(event.target.value)} placeholder="LinkedIn, referral..." value={source} /></label></div><label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Job description</span><textarea className="min-h-36 w-full resize-y rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 text-sm text-slate-200 outline-none focus:border-indigo-400/50" onChange={(event) => onDescription(event.target.value)} value={description} /></label></div>;
}
function ConditionalStep({ available, icon: Icon, title, ready, missing }: { available: boolean; icon: typeof Sparkles; title: string; ready: string; missing: string }) {
  return <div className="mx-auto max-w-xl text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-200"><Icon className="size-6" /></span><h2 className="mt-5 text-2xl font-semibold text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{available ? ready : missing}</p><div className={`mx-auto mt-6 w-fit rounded-lg border px-3 py-2 text-sm ${available ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-slate-700/45 bg-slate-900/25 text-slate-400"}`}>{available ? "Ready" : "Can be completed later"}</div></div>;
}
function FinishStep({ configured }: { configured: boolean[] }) {
  const labels = ["Resume added", "Application added", "Fit analysis completed"];
  return <div className="mx-auto max-w-xl"><div className="text-center"><BriefcaseBusiness className="mx-auto size-8 text-indigo-300" /><h2 className="mt-4 text-2xl font-semibold text-white">Your workspace is ready</h2><p className="mt-2 text-sm text-slate-400">Today will prioritize the most useful next action from the context you added.</p></div><div className="mt-7 space-y-2">{labels.map((label, index) => <div className="flex items-center gap-3 rounded-lg border border-slate-700/35 bg-slate-900/20 px-4 py-3 text-sm" key={label}><span className={`flex size-6 items-center justify-center rounded-md ${configured[index] ? "bg-emerald-300/10 text-emerald-200" : "bg-slate-700/40 text-slate-500"}`}>{configured[index] ? <Check className="size-4" /> : "–"}</span><span className={configured[index] ? "text-slate-200" : "text-slate-500"}>{label}</span></div>)}</div></div>;
}
function messageFor(cause: unknown, fallback: string) { return cause instanceof Error && cause.message ? cause.message : fallback; }
