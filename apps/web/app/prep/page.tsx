import { PageHeader } from "@/components/layout/page-header";
import { PrepWorkspace } from "@/components/prep/prep-workspace";

export default function PrepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prep"
        title="Technical interview prep"
        subtitle="Build coding fluency, reusable STAR stories, and system design judgment in one workspace."
      />
      <PrepWorkspace />
    </>
  );
}
