"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, FileUp, History, Loader2, Sparkles, Trash2 } from "lucide-react";
import type { ResumeAnalysis, ResumeVersion } from "@/lib/types";
import type { ResumeAnalysisInput } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const RESUME_ANALYSIS_PREFILL_KEY = "offeros:resume-analysis-prefill";

export function ResumeAnalysisPanel({
  resume,
  onAnalyze,
  onDeleteAnalysis,
  onListAnalyses,
  onUpdateResumeText,
  onUploadResumeFile,
}: {
  resume: ResumeVersion;
  onAnalyze: (resumeId: string, payload: ResumeAnalysisInput) => Promise<ResumeAnalysis>;
  onDeleteAnalysis: (analysisId: string) => Promise<void>;
  onListAnalyses: (resumeId: string) => Promise<ResumeAnalysis[]>;
  onUpdateResumeText: (resumeId: string, text: string) => Promise<ResumeVersion>;
  onUploadResumeFile?: (resumeId: string, file: File) => Promise<{ resume: ResumeVersion; extraction: { text: string; characterCount: number; warnings: string[] } }>;
}) {
  const [prefill] = useState(() => consumeAnalysisPrefill(resume.name));
  const [targetRole, setTargetRole] = useState(prefill.targetRole || resume.targetRole);
  const [companyName, setCompanyName] = useState(prefill.companyName);
  const [jobDescription, setJobDescription] = useState(prefill.jobDescription);
  const [resumeText, setResumeText] = useState(resume.extractedText);
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    onListAnalyses(resume.id)
      .then((items) => {
        setAnalyses(items);
        setSelectedId(items[0]?.id ?? "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load analysis history."))
      .finally(() => setHistoryLoading(false));
  }, [onListAnalyses, resume.id]);

  const selected = useMemo(
    () => analyses.find((analysis) => analysis.id === selectedId) ?? analyses[0] ?? null,
    [analyses, selectedId],
  );

  async function saveResumeText() {
    setSavingText(true);
    setError("");
    setMessage("");
    try {
      await onUpdateResumeText(resume.id, resumeText);
      setMessage(resumeText.trim() ? "Resume text saved." : "Resume text cleared.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save resume text.");
    } finally {
      setSavingText(false);
    }
  }

  async function runAnalysis() {
    if (!targetRole.trim()) {
      setError("Target role is required.");
      return;
    }
    if (!resumeText.trim()) {
      setError("Upload a resume file or paste resume text before running AI analysis.");
      return;
    }
    if (jobDescription.trim().length < 80) {
      setError("Paste a target job description before running analysis.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const analysis = await onAnalyze(resume.id, {
        targetRole: targetRole.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        resumeText: resumeText.trim(),
      });
      setAnalyses((current) => [analysis, ...current.filter((item) => item.id !== analysis.id)]);
      setSelectedId(analysis.id);
      setMessage("Analysis saved to history.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze this resume.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!file || !onUploadResumeFile) return;
    setUploading(true);
    setError("");
    setMessage("Uploading resume...");
    try {
      const result = await onUploadResumeFile(resume.id, file);
      setResumeText(result.extraction.text);
      setMessage(`Ready for analysis. Extracted ${result.extraction.characterCount.toLocaleString()} characters${result.extraction.warnings.length ? ` (${result.extraction.warnings[0]})` : "."}`);
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "Unable to upload and extract this resume.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAnalysis(analysisId: string) {
    setError("");
    setMessage("");
    try {
      await onDeleteAnalysis(analysisId);
      setAnalyses((current) => current.filter((analysis) => analysis.id !== analysisId));
      if (selectedId === analysisId) setSelectedId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete this analysis.");
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-300/20 bg-indigo-300/10 text-indigo-200">
          <BrainCircuit className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Resume Intelligence</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            SWE-focused job matching, required skill coverage, bullet strength, and recruiter readability. Upload PDF/DOCX/TXT or paste text manually.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="rounded-xl border border-slate-700/45 bg-slate-950/25 p-3">
          <span className="mb-2 block text-xs font-medium text-slate-500">Resume file</span>
          <input
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-400/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-100 hover:file:bg-indigo-400/20"
            disabled={uploading || !onUploadResumeFile}
            onChange={(event) => void uploadFile(event.target.files?.[0])}
            type="file"
          />
          <span className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
            {uploading ? "Uploading and extracting text..." : "PDF, DOCX, or TXT up to 5 MB. OCR for scanned PDFs is coming soon."}
          </span>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Target role</span>
          <Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Backend Software Engineer Intern" />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Company name</span>
          <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Acme" />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Job description</span>
          <textarea className="min-h-24 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-300/15" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste a SWE job description or key requirements." />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Resume text</span>
          <textarea className="min-h-36 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-300/15" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste the plain text from your resume." />
          {!resume.extractedText ? <span className="mt-1.5 block text-xs leading-5 text-slate-500">Upload a resume or paste text to run AI analysis.</span> : null}
        </label>
      </div>

      {error ? <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100">{message}</div> : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={savingText || loading || uploading} onClick={() => void saveResumeText()} variant="secondary">
          {savingText ? <Loader2 className="size-4 animate-spin" /> : null}
          {savingText ? "Saving text..." : "Save resume text"}
        </Button>
        <Button disabled={loading || savingText || uploading} onClick={() => void runAnalysis()} variant="primary">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? "Analyzing resume fit..." : "Run AI Analysis"}
        </Button>
      </div>

      {selected ? <AnalysisResult analysis={selected} /> : (
        <div className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4 text-sm leading-6 text-slate-500">
          {historyLoading ? "Loading analysis history..." : "Run an analysis to see scorecards, keyword gaps, and suggested bullet rewrites here."}
        </div>
      )}

      {analyses.length ? (
        <div className="space-y-2 border-t border-slate-700/35 pt-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500"><History className="size-3.5" />Analysis history</div>
          <div className="space-y-2">
            {analyses.map((analysis) => (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700/35 bg-slate-900/20 p-2" key={analysis.id}>
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(analysis.id)} type="button">
                  <div className="truncate text-sm font-medium text-slate-100">{analysis.targetRole}</div>
                  <div className="text-xs text-slate-500">{analysis.overallScore}% fit - {new Date(analysis.createdAt).toLocaleDateString()}</div>
                </button>
                <Button className="px-2" onClick={() => void deleteAnalysis(analysis.id)} variant="ghost" aria-label="Delete analysis">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AnalysisResult({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-700/35 bg-slate-950/20 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Score label="Overall" value={analysis.overallScore} />
        <Score label="Keywords" value={analysis.keywordScore} />
        <Score label="Impact" value={analysis.impactScore} />
        <Score label="Clarity" value={analysis.clarityScore} />
        <Score label="Technical depth" value={analysis.technicalDepthScore} className="col-span-2" />
        <Score label="Experience match" value={analysis.experienceMatchScore} className="col-span-2" />
      </div>
      <SkillMatchGroup label="Required skills" items={analysis.requiredSkillsMatch} />
      <SkillMatchGroup label="Preferred skills" items={analysis.preferredSkillsMatch} />
      <ChipGroup label="Strong keywords" items={analysis.strongKeywords} tone="green" />
      <ChipGroup label="Missing keywords" items={analysis.missingKeywords} tone="amber" />
      <WeakBulletGroup items={analysis.weakBullets} />
      {analysis.suggestedBulletRewrites.length ? (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-slate-500">Suggested rewrites</h4>
          <div className="space-y-2">
            {analysis.suggestedBulletRewrites.map((rewrite) => (
              <div className="rounded-lg border border-slate-700/35 bg-slate-900/20 p-3" key={`${rewrite.original}-${rewrite.rewrite}`}>
                <p className="text-xs leading-5 text-slate-500">{rewrite.original}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{rewrite.rewrite}</p>
                <p className="mt-2 text-xs leading-5 text-indigo-200/75">{rewrite.whyBetter}</p>
                <p className="mt-1 text-xs text-emerald-200/70">{rewrite.groundedInResume === false ? "Needs fact check before use" : "Grounded in resume content"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <ListGroup label="Strengths" items={analysis.strengths} />
      <ListGroup label="Risks" items={analysis.risks} />
      <ListGroup label="Recommendations" items={analysis.recommendations} />
      {analysis.recruiterSummary ? <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-sm leading-6 text-slate-300">{analysis.recruiterSummary}</div> : null}
      <div className="rounded-lg border border-indigo-300/15 bg-indigo-300/[0.05] p-3 text-sm leading-6 text-slate-300">{analysis.summary}</div>
      <div className="text-xs text-slate-600">Provider: {analysis.provider} - Model: {analysis.model}</div>
    </div>
  );
}

function SkillMatchGroup({ label, items }: { label: string; items: ResumeAnalysis["requiredSkillsMatch"] }) {
  return <div><h4 className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</h4><div className="space-y-2">{items.length ? items.slice(0, 12).map((item) => <div className="rounded-lg border border-slate-700/35 bg-slate-900/20 p-3" key={`${label}-${item.skill}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-200">{item.skill}</span><Badge tone={item.status === "strong" ? "green" : item.status === "partial" ? "amber" : "red"}>{item.status}</Badge></div>{item.evidence ? <p className="mt-2 text-xs leading-5 text-slate-500">{item.evidence}</p> : null}</div>) : <span className="text-sm text-slate-600">No skill coverage returned.</span>}</div></div>;
}

function Score({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return <div className={className}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-medium text-white">{value}%</span></div><Progress className="h-2" value={value} tone={value >= 82 ? "green" : value >= 65 ? "cyan" : "amber"} /></div>;
}

function ChipGroup({ label, items, tone }: { label: string; items: string[]; tone: "green" | "amber" }) {
  return <div><h4 className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</h4><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <Badge key={item} tone={tone}>{item}</Badge>) : <span className="text-sm text-slate-600">None found</span>}</div></div>;
}

function ListGroup({ label, items }: { label: string; items: string[] }) {
  return <div><h4 className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</h4>{items.length ? <ul className="space-y-2">{items.map((item) => <li className="rounded-lg border border-slate-700/35 bg-slate-900/20 px-3 py-2 text-sm leading-6 text-slate-300" key={item}>{item}</li>)}</ul> : <span className="text-sm text-slate-600">None recorded</span>}</div>;
}

function WeakBulletGroup({ items }: { items: ResumeAnalysis["weakBullets"] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase text-slate-500">Weak bullets</h4>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div className="rounded-lg border border-slate-700/35 bg-slate-900/20 p-3" key={`${item.original}-${item.issue}`}>
              <p className="text-sm leading-6 text-slate-300">{item.original}</p>
              <p className="mt-2 text-xs leading-5 text-amber-100/80">{item.issue}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.suggestion}</p>
            </div>
          ))}
        </div>
      ) : <span className="text-sm text-slate-600">None recorded</span>}
    </div>
  );
}

function consumeAnalysisPrefill(resumeName: string) {
  if (typeof window === "undefined") return { targetRole: "", companyName: "", jobDescription: "" };
  const raw = window.sessionStorage.getItem(RESUME_ANALYSIS_PREFILL_KEY);
  if (!raw) return { targetRole: "", companyName: "", jobDescription: "" };
  try {
    const parsed = JSON.parse(raw) as { targetRole?: string; companyName?: string; jobDescription?: string; resumeUsed?: string };
    if (parsed.resumeUsed && parsed.resumeUsed !== resumeName) return { targetRole: "", companyName: "", jobDescription: "" };
    window.sessionStorage.removeItem(RESUME_ANALYSIS_PREFILL_KEY);
    return {
      targetRole: parsed.targetRole ?? "",
      companyName: parsed.companyName ?? "",
      jobDescription: parsed.jobDescription ?? "",
    };
  } catch {
    window.sessionStorage.removeItem(RESUME_ANALYSIS_PREFILL_KEY);
    return { targetRole: "", companyName: "", jobDescription: "" };
  }
}
