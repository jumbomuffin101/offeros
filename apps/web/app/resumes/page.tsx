import { PageHeader } from "@/components/layout/page-header";
import { ResumeManager } from "@/components/resumes/resume-manager";
import { resumes } from "@/lib/mock-data";

export default function ResumesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resumes"
        title="Resume manager"
        subtitle="Manage targeted technical resumes for SWE, backend, AI/ML, quant, fintech, and new grad roles."
      />
      <ResumeManager initialResumes={resumes} />
    </>
  );
}
