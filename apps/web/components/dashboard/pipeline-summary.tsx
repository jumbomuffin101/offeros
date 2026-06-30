import type { ApplicationStatus } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PipelineSummary({
  counts,
  nextMove,
}: {
  counts: Record<ApplicationStatus, number>;
  nextMove: string;
}) {
  const stages: { label: ApplicationStatus; caption: string }[] = [
    { label: "Wishlist", caption: "Target" },
    { label: "Applying", caption: "In progress" },
    { label: "Applied", caption: "Submitted" },
    { label: "OA", caption: "Assessment" },
    { label: "Interview", caption: "Loop" },
    { label: "Final Round", caption: "Final loop" },
    { label: "Offer", caption: "Decision" },
    { label: "Rejected", caption: "Closed" },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Pipeline Summary</h2>
        <p className="mt-1 text-sm text-slate-500">Movement from target list to offer stage.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.label} className="relative">
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
            {nextMove}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
