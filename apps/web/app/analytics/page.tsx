import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { PageHeader } from "@/components/layout/page-header";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Recruiting analytics"
        subtitle="Understand response rates, conversion points, resume performance, and prep consistency."
      />
      <AnalyticsDashboard />
    </>
  );
}
