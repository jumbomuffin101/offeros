import { CodeXml } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function LeetCodePlaceholder() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
            <CodeXml className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white">LeetCode sync</h2>
              <Badge tone="amber">Coming soon</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connect your LeetCode username to import solved counts, difficulty breakdown, and recent practice.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
