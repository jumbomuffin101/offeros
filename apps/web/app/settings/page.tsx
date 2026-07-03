import { PageHeader } from "@/components/layout/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        subtitle="Manage your local technical recruiting workspace, app preferences, roadmap, and help."
      />
      <SettingsPanel />
    </>
  );
}
