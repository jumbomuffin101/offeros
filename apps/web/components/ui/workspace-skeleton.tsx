export function WorkspaceSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-5" aria-label="Loading workspace" role="status">
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800/55" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div className="rounded-xl border border-slate-700/35 bg-[#1b1d2b] p-5" key={index}>
            <div className="h-4 w-28 animate-pulse rounded bg-slate-700/60" />
            <div className="mt-5 h-8 w-20 animate-pulse rounded bg-slate-700/45" />
            <div className="mt-5 h-2 w-full animate-pulse rounded bg-slate-700/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
