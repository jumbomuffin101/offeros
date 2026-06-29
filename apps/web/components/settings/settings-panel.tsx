import { Bell, Database, Link2, Moon, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const settings = [
  {
    title: "Profile",
    description: "Name, school, graduation timeline, target roles, and locations.",
    icon: UserRound,
    status: "Local only",
  },
  {
    title: "Notifications",
    description: "Deadline reminders, OA nudges, follow-up prompts, and interview prep alerts.",
    icon: Bell,
    status: "Planned",
  },
  {
    title: "Data preferences",
    description: "Control mock data, export format, archive behavior, and retention rules.",
    icon: Database,
    status: "Local only",
  },
  {
    title: "Theme",
    description: "Dark-mode-first workspace with future accent and density options.",
    icon: Moon,
    status: "Active",
  },
  {
    title: "Integrations",
    description: "Chrome extension, calendar sync, email parsing, and job board imports.",
    icon: Link2,
    status: "Roadmap",
  },
];

export function SettingsPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {settings.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                </div>
                <Badge tone={item.status === "Active" ? "green" : "slate"}>{item.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
