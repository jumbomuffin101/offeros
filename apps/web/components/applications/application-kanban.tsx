import { ApplicationBoard } from "@/components/applications/application-board";
import type { Application } from "@/lib/types";

export function ApplicationKanban({ applications }: { applications: Application[] }) {
  return <ApplicationBoard initialApplications={applications} />;
}
