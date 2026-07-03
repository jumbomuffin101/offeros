import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back, Aryan"
        subtitle="SWE applications, OAs, interviews, targeted resumes, and prep in one operating view."
      />
      <DashboardContent />
    </>
  );
}
