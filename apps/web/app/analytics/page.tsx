import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { PageHeader } from "@/components/layout/page-header";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Recruiting analytics"
        subtitle="Measure technical recruiting performance, interview conversion, resume usage, and prep consistency."
      />
      <AnalyticsDashboard />
    </>
  );
}
