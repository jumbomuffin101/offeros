import type { ApplicationStatus } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PipelineSummary({
  counts,
}: {
  counts: Record<ApplicationStatus, number>;
}) {
  const stages: { label: ApplicationStatus; caption: string }[] = [
    { label: "Wishlist", caption: "Target" },
    { label: "Applied", caption: "Submitted" },
    { label: "OA", caption: "Assessment" },
    { label: "Interview", caption: "Loop" },
    { label: "Offer", caption: "Decision" },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Pipeline Summary</h2>
        <p className="mt-1 text-sm text-slate-500">Movement from target list to offer stage.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-5">
          {stages.map((stage, index) => (
            <div key={stage.label} className="relative">
              {index < stages.length - 1 ? (
                <div className="absolute left-[calc(50%+1.6rem)] right-[calc(-50%+1.6rem)] top-8 hidden h-px bg-gradient-to-r from-cyan-300/50 to-slate-700 sm:block" />
              ) : null}
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-lg font-semibold text-white">
                  {counts[stage.label] ?? 0}
                </div>
                <div className="mt-3 text-sm font-semibold text-white">{stage.label}</div>
                <div className="mt-1 text-xs text-slate-500">{stage.caption}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
          <div className="text-sm font-semibold text-emerald-100">Best next move</div>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Convert the Google OA and Meta interview into the next offer-stage opportunity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
