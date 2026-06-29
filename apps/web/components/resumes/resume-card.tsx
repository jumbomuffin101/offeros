import { Copy, Eye, Sparkles } from "lucide-react";
import type { ResumeVersion } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ResumeCard({ resume }: { resume: ResumeVersion }) {
  return (
    <Card className="transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{resume.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{resume.focus}</p>
          </div>
          <Badge tone={resume.status === "Active" ? "green" : "amber"}>{resume.status}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Last updated</div>
            <div className="mt-1 font-medium text-slate-100">{resume.lastUpdated}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Applications</div>
            <div className="mt-1 font-medium text-slate-100">
              {resume.applicationsUsedFor}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-400">Keyword match</span>
            <span className="font-semibold text-white">{resume.keywordMatchScore}%</span>
          </div>
          <Progress value={resume.keywordMatchScore} tone="green" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Button className="px-2" variant="ghost">
            <Eye className="size-4" />
            View
          </Button>
          <Button className="px-2" variant="ghost">
            <Sparkles className="size-4" />
            Improve
          </Button>
          <Button className="px-2" variant="ghost">
            <Copy className="size-4" />
            Duplicate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
