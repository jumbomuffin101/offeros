"use client";

import { Play, Sparkles } from "lucide-react";
import type {
  Application,
  MockInterviewDifficulty,
  MockInterviewType,
  ResumeVersion,
} from "@/lib/types";
import type { MockInterviewCreateInput } from "@/lib/data/types";
import type { MockInterviewPlanResult } from "@/lib/data/types";
import { Button } from "@/components/ui/button";

export function MockInterviewConfig({
  applications,
  resumes,
  value,
  busy,
  onChange,
  onStart,
  plan,
  planLoading,
}: {
  applications: Application[];
  resumes: ResumeVersion[];
  value: MockInterviewCreateInput;
  busy: boolean;
  onChange: (value: MockInterviewCreateInput) => void;
  onStart: () => void;
  plan?: MockInterviewPlanResult;
  planLoading: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-lg border border-indigo-300/20 bg-indigo-300/10 p-2.5 text-indigo-200">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Start new interview</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Practice one question at a time using only the context you select.
          </p>
        </div>
      </div>
      <section className="mt-5 rounded-lg border border-slate-700/35 bg-slate-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-medium text-slate-200">Recommended focus</h3><p className="mt-1 text-xs text-slate-500">Career Intelligence suggestions remain adjustable and never override your interview settings.</p></div>
          {planLoading ? <span className="text-xs text-slate-500">Updating...</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan?.questionPlan.focusAreas.map((item) => {
            const selected = value.focusAreas?.includes(item.key) ?? false;
            return <button aria-pressed={selected} className={`rounded-md border px-2.5 py-1.5 text-xs transition ${selected ? "border-indigo-300/30 bg-indigo-300/10 text-indigo-100" : "border-slate-700/40 text-slate-500 hover:text-slate-300"}`} key={item.key} onClick={() => onChange({ ...value, focusAreas: selected ? (value.focusAreas?.length === 1 ? value.focusAreas : value.focusAreas?.filter((key) => key !== item.key)) : [...(value.focusAreas ?? []), item.key] })} title={item.reason} type="button">{item.label}</button>;
          })}
          {!planLoading && !plan?.questionPlan.focusAreas.length ? <span className="text-xs text-slate-500">Balanced baseline focus</span> : null}
        </div>
        {plan && plan.intelligenceStatus !== "ready" ? <p className="mt-3 text-xs text-amber-200/80">Career Intelligence is partially unavailable. The interview will continue with a deterministic plan.</p> : null}
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Application">
          <Select
            ariaLabel="Application"
            value={value.applicationId ?? ""}
            onChange={(applicationId) => {
              const application = applications.find((item) => item.id === applicationId);
              onChange({
                ...value,
                applicationId: applicationId || undefined,
                resumeVersionId: application?.resumeVersionId ?? value.resumeVersionId,
              });
            }}
          >
            <option value="">No application context</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.company} - {application.role}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Resume">
          <Select
            ariaLabel="Resume"
            value={value.resumeVersionId ?? ""}
            onChange={(resumeVersionId) =>
              onChange({ ...value, resumeVersionId: resumeVersionId || undefined })
            }
          >
            <option value="">No resume context</option>
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.name} - {resume.targetRole}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Interview type">
          <Select
            ariaLabel="Interview type"
            value={value.interviewType}
            onChange={(interviewType) =>
              onChange({ ...value, interviewType: interviewType as MockInterviewType })
            }
          >
            <option value="behavioral">Behavioral</option>
            <option value="resume">Resume deep dive</option>
            <option value="technical">Technical concepts</option>
            <option value="system_design">System design</option>
            <option value="mixed">Mixed</option>
          </Select>
        </Field>
        <Field label="Difficulty">
          <Select
            ariaLabel="Difficulty"
            value={value.difficulty}
            onChange={(difficulty) =>
              onChange({ ...value, difficulty: difficulty as MockInterviewDifficulty })
            }
          >
            <option value="introductory">Introductory</option>
            <option value="standard">Standard</option>
            <option value="challenging">Challenging</option>
          </Select>
        </Field>
        <Field label="Main questions">
          <Select
            ariaLabel="Number of questions"
            value={String(value.questionCount)}
            onChange={(questionCount) =>
              onChange({ ...value, questionCount: Number(questionCount) })
            }
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <option key={count} value={count}>{count} questions</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/30 pt-4">
        <p className="text-xs text-slate-500">
          OfferOS does not claim knowledge of a company&apos;s private interview process.
        </p>
        <Button disabled={busy} onClick={onStart} variant="primary">
          <Play className="size-4" />
          {busy ? "Preparing interview..." : "Start interview"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>{children}</label>;
}

function Select({
  ariaLabel,
  value,
  onChange,
  children,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-11 w-full rounded-lg border border-slate-700/55 bg-slate-950/35 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}
