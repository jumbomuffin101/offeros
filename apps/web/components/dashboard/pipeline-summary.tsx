import type { ApplicationStatus } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { applicationStatuses } from "@/lib/mock-data";

export function PipelineSummary({
  counts,
}: {
  counts: Record<ApplicationStatus, number>;
}) {
  const max = Math.max(...Object.values(counts), 1);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Pipeline Summary</h2>
        <p className="mt-1 text-sm text-slate-500">Current application volume by stage.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {applicationStatuses.map((status) => (
          <div key={status}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-300">{status}</span>
              <span className="font-medium text-white">{counts[status] ?? 0}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300"
                style={{ width: `${((counts[status] ?? 0) / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
