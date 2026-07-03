"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/hooks/use-modal-behavior";
import { cn } from "@/lib/utils";

export function ModalShell({
  labelledBy,
  header,
  footer,
  children,
  className,
}: {
  labelledBy: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useModalBehavior();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/75 p-4 backdrop-blur-xl">
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cn(
          "glass-card page-enter flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl",
          className,
        )}
        ref={dialogRef}
        role="dialog"
      >
        <div className="shrink-0 border-b border-white/10 bg-[#1b1d2b] px-4 py-4 sm:px-6 sm:py-5">
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-8 sm:px-6">
          {children}
        </div>
        <div className="shrink-0 border-t border-white/10 bg-[#1b1d2b] px-4 py-4 sm:px-6 sm:py-5">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
