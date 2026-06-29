import { Brain, Code2, Flame, Network, Play, Star } from "lucide-react";
import type { PrepTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PrepBoard({ tasks }: { tasks: PrepTask[] }) {
  const coding = tasks.find((task) => task.type === "Coding");
  const behavioral = tasks.find((task) => task.type === "Behavioral");
  const system = tasks.find((task) => task.type === "System Design");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        {coding ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200">
                  <Code2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Daily Coding Problem</h2>
                  <p className="text-sm text-slate-500">One focused rep for interview speed.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{coding.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="amber">{coding.difficulty}</Badge>
                    <Badge tone="cyan">{coding.topic}</Badge>
                    <Badge>{coding.targetTime}</Badge>
                    <Badge tone="purple">{coding.status}</Badge>
                  </div>
                </div>
                <Button variant="primary">
                  <Play className="size-4" />
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {behavioral ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-violet-300/20 bg-violet-300/10 p-2 text-violet-200">
                  <Brain className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Behavioral Practice</h2>
                  <p className="text-sm text-slate-500">Turn raw stories into crisp answers.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium leading-7 text-white">{behavioral.title}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {["Situation", "Task", "Action", "Result"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-300 to-cyan-300" />
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-5" variant="primary">
                Practice Answer
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {system ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-200">
                  <Network className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">System Design Prep</h2>
                  <p className="text-sm text-slate-500">Build vocabulary before interviews ask for it.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-sm text-slate-500">Prompt</div>
                <div className="mt-2 text-xl font-semibold text-white">{system.title}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["caching", "database schema", "API design"].map((concept) => (
                  <Badge key={concept} tone="green">
                    {concept}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Prep Streak</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <Flame className="size-9 text-amber-300" />
              <div>
                <div className="text-4xl font-semibold text-white">9 days</div>
                <p className="mt-1 text-sm text-slate-500">Coding or interview prep completed.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Weekly Progress</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Coding", 78, "cyan"],
              ["Behavioral", 54, "purple"],
              ["System design", 32, "green"],
            ].map(([label, value, tone]) => (
              <div key={label as string}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-white">{value}%</span>
                </div>
                <Progress
                  value={value as number}
                  tone={tone as "cyan" | "green" | "purple"}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Star className="mb-3 size-5 text-cyan-300" />
            <h2 className="text-lg font-semibold text-white">Next best prep move</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Finish the Google OA practice set, then rehearse the technical problem story once.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
