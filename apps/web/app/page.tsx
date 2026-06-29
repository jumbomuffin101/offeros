import {
  BriefcaseBusiness,
  CalendarClock,
  Code2,
  Flame,
  Handshake,
  MessageSquareMore,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DeadlineList } from "@/components/dashboard/deadline-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MomentumCard } from "@/components/dashboard/momentum-card";
import { PipelineSummary } from "@/components/dashboard/pipeline-summary";
import { RecruitingPlan } from "@/components/dashboard/recruiting-plan";
import { PageHeader } from "@/components/layout/page-header";
import {
  activities,
  applicationStatuses,
  applications,
  deadlines,
} from "@/lib/mock-data";
import type { ApplicationStatus } from "@/lib/types";

export default function DashboardPage() {
  const counts = applicationStatuses.reduce(
    (acc, status) => {
      acc[status] = applications.filter((application) => application.status === status).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  const activeInterviews =
    (counts.Interview ?? 0) + (counts["Final Round"] ?? 0);
  const responseRate = Math.round((3 / applications.length) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back, Aryan"
        subtitle="Your recruiting pipeline, interview prep, and progress in one place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Applications Sent"
          value={String(applications.filter((item) => item.dateApplied).length)}
          helper="Across active targets"
          trend="+4 this week"
          sparkline={[42, 58, 48, 64, 78, 68, 86]}
          icon={<BriefcaseBusiness className="size-5" />}
        />
        <KpiCard
          label="Active Interviews"
          value={String(activeInterviews)}
          helper="In interview loops"
          trend="+1 loop opened"
          sparkline={[20, 24, 38, 42, 52, 56, 64]}
          tone="purple"
          icon={<MessageSquareMore className="size-5" />}
        />
        <KpiCard
          label="OAs Pending"
          value={String(counts.OA)}
          helper="Due this week"
          trend="2 due soon"
          sparkline={[60, 45, 72, 38, 58, 44, 50]}
          tone="amber"
          icon={<Code2 className="size-5" />}
        />
        <KpiCard
          label="Offers"
          value={String(counts.Offer)}
          helper="Decision window open"
          trend="1 active offer"
          sparkline={[12, 16, 18, 24, 38, 52, 78]}
          tone="green"
          icon={<Handshake className="size-5" />}
        />
        <KpiCard
          label="Response Rate"
          value={`${responseRate}%`}
          helper="Mock response signal"
          trend="+8% vs last month"
          sparkline={[28, 32, 35, 38, 42, 40, 48]}
          icon={<CalendarClock className="size-5" />}
        />
        <KpiCard
          label="Prep Streak"
          value="9"
          helper="Days in a row"
          trend="+3 day streak"
          sparkline={[30, 44, 58, 66, 74, 84, 92]}
          tone="green"
          icon={<Flame className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <RecruitingPlan />
        <PipelineSummary counts={counts} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <MomentumCard />
        <DeadlineList deadlines={deadlines} />
      </div>

      <div className="mt-6">
        <ActivityFeed activities={activities} />
      </div>
    </>
  );
}
