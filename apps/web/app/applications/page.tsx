import { ApplicationKanban } from "@/components/applications/application-kanban";
import { PageHeader } from "@/components/layout/page-header";
import { applications } from "@/lib/mock-data";

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Application tracker"
        subtitle="A Kanban-style pipeline for every company, resume version, deadline, and note."
      />
      <ApplicationKanban applications={applications} />
    </>
  );
}
