import { PageHeader } from "@/components/layout/page-header";
import { PrepBoard } from "@/components/prep/prep-board";
import { prepTasks } from "@/lib/mock-data";

export default function PrepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prep"
        title="Interview prep"
        subtitle="Daily coding, behavioral practice, system design prompts, and consistency tracking."
      />
      <PrepBoard tasks={prepTasks} />
    </>
  );
}
