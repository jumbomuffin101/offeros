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
          icon={<BriefcaseBusiness className="size-5" />}
        />
        <KpiCard
          label="Active Interviews"
          value={String(activeInterviews)}
          helper="In interview loops"
          icon={<MessageSquareMore className="size-5" />}
        />
        <KpiCard
          label="OAs Pending"
          value={String(counts.OA)}
          helper="Due this week"
          icon={<Code2 className="size-5" />}
        />
        <KpiCard
          label="Offers"
          value={String(counts.Offer)}
          helper="Decision window open"
          icon={<Handshake className="size-5" />}
        />
        <KpiCard
          label="Response Rate"
          value={`${responseRate}%`}
          helper="Mock response signal"
          icon={<CalendarClock className="size-5" />}
        />
        <KpiCard
          label="Prep Streak"
          value="9"
          helper="Days in a row"
          icon={<Flame className="size-5" />}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <RecruitingPlan />
        <PipelineSummary counts={counts} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DeadlineList deadlines={deadlines} />
        <ActivityFeed activities={activities} />
      </div>
    </>
  );
}
