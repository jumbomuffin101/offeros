import { InboxWorkspace } from "@/components/inbox/inbox-workspace";
import { PageHeader } from "@/components/layout/page-header";

export default function InboxPage() {
  return (
    <>
      <PageHeader
        eyebrow="Smart inbox"
        title="Needs attention"
        subtitle="Deterministic recruiting signals ranked by urgency, deadline, and next action."
      />
      <InboxWorkspace />
    </>
  );
}
