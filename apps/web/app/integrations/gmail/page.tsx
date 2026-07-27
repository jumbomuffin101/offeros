import { GmailWorkspace } from "@/components/gmail/gmail-workspace";
import { PageHeader } from "@/components/layout/page-header";

export default function GmailIntegrationPage() {
  return <div className="space-y-6"><PageHeader eyebrow="Integrations" title="Gmail review" subtitle="Review recruiting email suggestions before they affect your application workspace." /><GmailWorkspace /></div>;
}
