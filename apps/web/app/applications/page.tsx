import { ApplicationKanban } from "@/components/applications/application-kanban";
import { PageHeader } from "@/components/layout/page-header";

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Application tracker"
        subtitle="Track internships and new grad roles from application through OAs, interviews, and offers."
      />
      <ApplicationKanban />
    </>
  );
}
