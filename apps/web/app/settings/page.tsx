import { PageHeader } from "@/components/layout/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        subtitle="Basic local preferences and integration placeholders for the OfferOS MVP."
      />
      <SettingsPanel />
    </>
  );
}
