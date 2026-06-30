import { PageHeader } from "@/components/layout/page-header";
import { ResumeManager } from "@/components/resumes/resume-manager";
import { resumes } from "@/lib/mock-data";

export default function ResumesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resumes"
        title="Resume manager"
        subtitle="Track targeted resume versions, keyword alignment, and where each version is being used."
      />
      <ResumeManager initialResumes={resumes} />
    </>
  );
}
