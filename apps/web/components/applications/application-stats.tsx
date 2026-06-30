import { BriefcaseBusiness, MessageSquareMore, Trophy, XCircle } from "lucide-react";
import type { Application } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

export function ApplicationStats({ applications }: { applications: Application[] }) {
  const activePipelines = applications.filter(
    (application) => !["Rejected", "Offer"].includes(application.status),
  ).length;
  const interviews = applications.filter((application) =>
    ["Interview", "Final Round"].includes(application.status),
  ).length;
  const offers = applications.filter((application) => application.status === "Offer").length;
  const rejections = applications.filter((application) => application.status === "Rejected").length;

  const stats = [
    { label: "Total applications", value: applications.length, icon: BriefcaseBusiness, tone: "text-cyan-200" },
    { label: "Active pipelines", value: activePipelines, icon: MessageSquareMore, tone: "text-violet-200" },
    { label: "Interviews", value: interviews, icon: MessageSquareMore, tone: "text-amber-200" },
    { label: "Offers", value: offers, icon: Trophy, tone: "text-emerald-200" },
    { label: "Rejections", value: rejections, icon: XCircle, tone: "text-rose-200" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card className="premium-hover" key={stat.label}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-2xl font-semibold text-white">{stat.value}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{stat.label}</div>
              </div>
              <div className={`rounded-2xl border border-white/10 bg-white/[0.045] p-2.5 ${stat.tone}`}>
                <Icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
