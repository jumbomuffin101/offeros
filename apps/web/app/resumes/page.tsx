import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResumeCard } from "@/components/resumes/resume-card";
import { ResumeInsights } from "@/components/resumes/resume-insights";
import { Button } from "@/components/ui/button";
import { resumes } from "@/lib/mock-data";

export default function ResumesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resumes"
        title="Resume manager"
        subtitle="Track targeted resume versions, keyword alignment, and where each version is being used."
        actions={
          <Button variant="primary">
            <Upload className="size-4" />
            Upload Resume
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
      <div className="mt-5">
        <ResumeInsights />
      </div>
    </>
  );
}
