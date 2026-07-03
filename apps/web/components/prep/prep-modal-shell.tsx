"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export function PrepModalShell({
  title,
  description,
  children,
  onClose,
  onSave,
  saveLabel,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const titleId = "prep-form-title";

  return (
    <ModalShell
      className="max-w-3xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button onClick={onSave} type="button" variant="primary">{saveLabel}</Button>
        </div>
      }
      header={
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white" id={titleId}>{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button
            aria-label={`Close ${title}`}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      }
      labelledBy={titleId}
    >
      <div className="space-y-4">{children}</div>
    </ModalShell>
  );
}
