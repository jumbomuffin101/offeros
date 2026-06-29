import { Bell, Database, Link2, Moon, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const settings = [
  {
    title: "Profile",
    description: "Name, school, graduation timeline, target roles, and locations.",
    icon: UserRound,
    status: "Local only",
    enabled: true,
  },
  {
    title: "Notifications",
    description: "Deadline reminders, OA nudges, follow-up prompts, and interview prep alerts.",
    icon: Bell,
    status: "Planned",
    enabled: true,
  },
  {
    title: "Data preferences",
    description: "Control mock data, export format, archive behavior, and retention rules.",
    icon: Database,
    status: "Local only",
    enabled: false,
  },
  {
    title: "Theme",
    description: "Dark-mode-first workspace with future accent and density options.",
    icon: Moon,
    status: "Active",
    enabled: true,
  },
  {
    title: "Integrations",
    description: "Chrome extension, calendar sync, email parsing, and job board imports.",
    icon: Link2,
    status: "Roadmap",
    enabled: false,
  },
];

export function SettingsPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {settings.map((item) => {
        const Icon = item.icon;

        return (
          <Card className="premium-hover" key={item.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                </div>
                <Badge tone={item.status === "Active" ? "green" : "slate"}>{item.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500">{item.description}</p>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-white">Workspace setting</div>
                  <div className="mt-1 text-xs text-slate-500">Placeholder control for the MVP shell</div>
                </div>
                <div
                  className={`flex h-7 w-12 items-center rounded-full border p-1 transition ${
                    item.enabled
                      ? "justify-end border-cyan-300/30 bg-cyan-300/15"
                      : "justify-start border-white/10 bg-slate-900"
                  }`}
                >
                  <span className="size-5 rounded-full bg-white shadow-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
