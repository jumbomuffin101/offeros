"use client";

import type { ReactNode } from "react";
import type {
  Application,
  ApplicationPriority,
  ApplicationStatus,
  ResumeVersion,
} from "@/lib/types";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";

export type ApplicationWorkspaceDraft = {
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  dateApplied: string;
  deadline: string;
  source: string;
  salaryRange: string;
  recruiterName: string;
  recruiterEmail: string;
  jobUrl: string;
  jobDescription: string;
  resumeVersionId: string;
  priority: ApplicationPriority;
  tags: string;
  notes: string;
};

const priorities: ApplicationPriority[] = ["Low", "Medium", "High"];
const controlClass = "h-10 w-full rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-300/50 focus:ring-2 focus:ring-indigo-300/10";

export function ApplicationWorkspaceForm({
  draft,
  resumes,
  onChange,
}: {
  draft: ApplicationWorkspaceDraft;
  resumes: ResumeVersion[];
  onChange: <K extends keyof ApplicationWorkspaceDraft>(
    key: K,
    value: ApplicationWorkspaceDraft[K],
  ) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-700/35 bg-slate-900/20 p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-white">Application details</h3>
        <p className="mt-1 text-sm text-slate-500">Keep the role context current for tracking, analysis, and Copilot.</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Company" required>
          <input className={controlClass} onChange={(event) => onChange("company", event.target.value)} value={draft.company} />
        </Field>
        <Field label="Role" required>
          <input className={controlClass} onChange={(event) => onChange("role", event.target.value)} value={draft.role} />
        </Field>
        <Field label="Location">
          <input className={controlClass} onChange={(event) => onChange("location", event.target.value)} value={draft.location} />
        </Field>
        <Field label="Application status">
          <select className={controlClass} onChange={(event) => onChange("status", event.target.value as ApplicationStatus)} value={draft.status}>
            {APPLICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <input className={controlClass} onChange={(event) => onChange("source", event.target.value)} value={draft.source} />
        </Field>
        <Field label="Salary">
          <input className={controlClass} onChange={(event) => onChange("salaryRange", event.target.value)} placeholder="$120k-$150k" value={draft.salaryRange} />
        </Field>
        <Field label="Recruiter">
          <input className={controlClass} onChange={(event) => onChange("recruiterName", event.target.value)} value={draft.recruiterName} />
        </Field>
        <Field label="Recruiter email">
          <input className={controlClass} onChange={(event) => onChange("recruiterEmail", event.target.value)} type="email" value={draft.recruiterEmail} />
        </Field>
        <Field label="Date applied">
          <input className={controlClass} onChange={(event) => onChange("dateApplied", event.target.value)} type="date" value={draft.dateApplied} />
        </Field>
        <Field label="Deadline">
          <input className={controlClass} onChange={(event) => onChange("deadline", event.target.value)} type="date" value={draft.deadline} />
        </Field>
        <Field label="Selected resume">
          <select className={controlClass} onChange={(event) => onChange("resumeVersionId", event.target.value)} value={draft.resumeVersionId}>
            <option value="">Select a saved resume</option>
            {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name} - {resume.targetRole}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={controlClass} onChange={(event) => onChange("priority", event.target.value as ApplicationPriority)} value={draft.priority}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field className="md:col-span-2" label="Job URL">
          <input className={controlClass} onChange={(event) => onChange("jobUrl", event.target.value)} type="url" value={draft.jobUrl} />
        </Field>
        <Field className="md:col-span-2" label="Job description">
          <textarea
            className={`${controlClass} min-h-64 resize-y py-3 leading-6`}
            onChange={(event) => onChange("jobDescription", event.target.value)}
            placeholder="Paste the full job description and requirements."
            value={draft.jobDescription}
          />
        </Field>
        <Field className="md:col-span-2" label="Tags">
          <input className={controlClass} onChange={(event) => onChange("tags", event.target.value)} placeholder="backend, fintech, referral" value={draft.tags} />
        </Field>
        <Field className="md:col-span-2" label="Notes">
          <textarea className={`${controlClass} min-h-32 resize-y py-3 leading-6`} onChange={(event) => onChange("notes", event.target.value)} value={draft.notes} />
        </Field>
      </div>
    </section>
  );
}

export function draftFromApplication(application: Application): ApplicationWorkspaceDraft {
  return {
    company: application.company,
    role: application.role,
    location: application.location,
    status: application.status,
    dateApplied: application.dateApplied,
    deadline: application.deadline,
    source: application.source,
    salaryRange: application.salaryRange,
    recruiterName: application.recruiterName,
    recruiterEmail: application.recruiterEmail,
    jobUrl: application.jobUrl,
    jobDescription: application.jobDescription ?? "",
    resumeVersionId: application.resumeVersionId ?? "",
    priority: application.priority,
    tags: application.tags.join(", "),
    notes: application.notes,
  };
}

function Field({
  children,
  className,
  label,
  required,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}{required ? <span className="text-indigo-300"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
