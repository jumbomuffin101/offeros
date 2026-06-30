import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back, Aryan"
        subtitle="Your recruiting pipeline, interview prep, and progress in one place."
      />
      <DashboardContent />
    </>
  );
}
