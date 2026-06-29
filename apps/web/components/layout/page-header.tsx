import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
