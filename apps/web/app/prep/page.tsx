import { PageHeader } from "@/components/layout/page-header";
import { PrepWorkspace } from "@/components/prep/prep-workspace";
import { prepWorkspaceData } from "@/lib/mock-data";

export default function PrepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prep"
        title="Interview prep"
        subtitle="Daily coding, behavioral practice, system design prompts, and consistency tracking."
      />
      <PrepWorkspace initialData={prepWorkspaceData} />
    </>
  );
}
