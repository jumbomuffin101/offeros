import type { ResumeVersion } from "@/lib/types";

export function resumeFilePresentation(resume: Pick<ResumeVersion, "fileName" | "originalFileName">, replacing: boolean) {
  const storedName = resume.originalFileName || resume.fileName;
  return {
    storedName,
    showPicker: !storedName || replacing,
  };
}
