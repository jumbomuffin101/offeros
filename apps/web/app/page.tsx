import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="What should you do today?"
        subtitle="One focused view of urgent recruiting work, upcoming deadlines, and weekly progress."
      />
      <DashboardContent />
    </>
  );
}
