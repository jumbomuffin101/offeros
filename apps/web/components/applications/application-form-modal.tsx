"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { APPLICATION_STATUSES } from "@/lib/data/types/constants";
import { parseTags } from "@/lib/application-utils";
import type { Application, ApplicationPriority, ApplicationStatus } from "@/lib/types";
import type { ApplicationInput } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";

export type ApplicationFormPayload = ApplicationInput;

const priorities: ApplicationPriority[] = ["Low", "Medium", "High"];

const emptyForm: ApplicationFormPayload = {
  company: "",
  role: "",
  location: "",
  status: "Wishlist",
  dateApplied: "",
  deadline: "",
  source: "",
  resumeUsed: "General SWE Resume",
  jobUrl: "",
  recruiterName: "",
  recruiterEmail: "",
  salaryRange: "",
  priority: "Medium",
  notes: "",
  tags: [],
};

export function ApplicationFormModal({
  open,
  application,
  onClose,
  onSubmit,
  resumeOptions,
}: {
  open: boolean;
  application: Application | null;
  onClose: () => void;
  onSubmit: (payload: ApplicationFormPayload) => void;
  resumeOptions: string[];
}) {
  if (!open) {
    return null;
  }

  return (
    <ApplicationFormModalContent
      application={application}
      key={application?.id ?? "new"}
      onClose={onClose}
      onSubmit={onSubmit}
      resumeOptions={resumeOptions}
    />
  );
}

function ApplicationFormModalContent({
  application,
  onClose,
  onSubmit,
  resumeOptions,
}: {
  application: Application | null;
  onClose: () => void;
  onSubmit: (payload: ApplicationFormPayload) => void;
  resumeOptions: string[];
}) {
  const [form, setForm] = useState<ApplicationFormPayload>(() =>
    application ? payloadFromApplication(application) : emptyForm,
  );
  const [tagValue, setTagValue] = useState(() => application?.tags.join(", ") ?? "");
  const [error, setError] = useState("");

  function updateField<K extends keyof ApplicationFormPayload>(
    key: K,
    value: ApplicationFormPayload[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (!form.company.trim() || !form.role.trim()) {
      setError("Company name and role title are required.");
      return;
    }

    onSubmit({
      ...form,
      company: form.company.trim(),
      role: form.role.trim(),
      location: form.location.trim(),
      source: form.source.trim(),
      resumeUsed: form.resumeUsed.trim(),
      jobUrl: form.jobUrl.trim(),
      recruiterName: form.recruiterName.trim(),
      recruiterEmail: form.recruiterEmail.trim(),
      salaryRange: form.salaryRange.trim(),
      notes: form.notes.trim(),
      tags: parseTags(tagValue),
    });
  }

  return (
    <ModalShell
      className="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button onClick={submit} type="button" variant="primary">
            {application ? "Save changes" : "Create application"}
          </Button>
        </div>
      }
      header={
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white" id="application-form-title">
              {application ? "Edit application" : "Add application"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track the recruiting details that matter later.
            </p>
          </div>
          <button
            aria-label="Close application form"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      }
      labelledBy="application-form-title"
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company name" required>
              <Input data-autofocus value={form.company} onChange={(event) => updateField("company", event.target.value)} />
            </Field>
            <Field label="Role title" required>
              <Input value={form.role} onChange={(event) => updateField("role", event.target.value)} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(value) => updateField("status", value as ApplicationStatus)}
                options={APPLICATION_STATUSES}
              />
            </Field>
            <Field label="Date applied">
              <Input type="date" value={form.dateApplied} onChange={(event) => updateField("dateApplied", event.target.value)} />
            </Field>
            <Field label="Deadline">
              <Input type="date" value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} />
            </Field>
            <Field label="Source">
              <Input value={form.source} onChange={(event) => updateField("source", event.target.value)} />
            </Field>
            <Field label="Resume used">
              <Select
                value={form.resumeUsed}
                onChange={(value) => updateField("resumeUsed", value)}
                options={Array.from(new Set([form.resumeUsed, ...resumeOptions])).filter(Boolean)}
              />
            </Field>
            <Field label="Job URL">
              <Input value={form.jobUrl} onChange={(event) => updateField("jobUrl", event.target.value)} />
            </Field>
            <Field label="Recruiter name">
              <Input value={form.recruiterName} onChange={(event) => updateField("recruiterName", event.target.value)} />
            </Field>
            <Field label="Recruiter email">
              <Input type="email" value={form.recruiterEmail} onChange={(event) => updateField("recruiterEmail", event.target.value)} />
            </Field>
            <Field label="Salary range">
              <Input value={form.salaryRange} onChange={(event) => updateField("salaryRange", event.target.value)} />
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(value) => updateField("priority", value as ApplicationPriority)}
                options={priorities}
              />
            </Field>
            <Field label="Tags">
              <Input
                placeholder="backend, fintech, referral"
                value={tagValue}
                onChange={(event) => setTagValue(event.target.value)}
              />
            </Field>
            <Field className="md:col-span-2" label="Notes">
              <textarea
                className="min-h-28 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </Field>
      </div>
    </ModalShell>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required ? <span className="text-cyan-300"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function payloadFromApplication(application: Application): ApplicationFormPayload {
  return {
    company: application.company,
    role: application.role,
    location: application.location,
    status: application.status,
    dateApplied: application.dateApplied,
    deadline: application.deadline,
    source: application.source,
    resumeUsed: application.resumeUsed,
    jobUrl: application.jobUrl,
    recruiterName: application.recruiterName,
    recruiterEmail: application.recruiterEmail,
    salaryRange: application.salaryRange,
    priority: application.priority,
    notes: application.notes,
    tags: application.tags,
  };
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
