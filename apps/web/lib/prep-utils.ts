import type { PrepGoal, PrepSession, PrepStatus, PrepWorkspaceData, WeeklyPrepDay } from "@/lib/types";

export const prepStatuses: PrepStatus[] = ["Not Started", "In Progress", "Completed", "Skipped"];

export function parseConcepts(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function formatPrepDate(value: string) {
  if (!value) return "Not completed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function updateCompletion(
  data: PrepWorkspaceData,
  itemId: string,
  type: PrepSession["type"],
  status: PrepStatus,
  completedAt: string,
) {
  const remaining = data.sessions.filter((session) => session.itemId !== itemId);
  const sessions = status === "Completed"
    ? [...remaining, { id: `session-${timestampId(completedAt)}-${itemId}`, itemId, type, completedAt }]
    : remaining;
  return { ...data, sessions, weeklyDays: buildWeeklyDays(sessions) };
}

export function buildWeeklyDays(sessions: PrepSession[], today = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = localDateKey(date);
    const daySessions = sessions.filter((session) => localDateKey(new Date(session.completedAt)) === key);
    return {
      date: key,
      coding: daySessions.filter((session) => session.type === "coding").length,
      behavioral: daySessions.filter((session) => session.type === "behavioral").length,
      systemDesign: daySessions.filter((session) => session.type === "systemDesign").length,
    };
  });
}

export function prepGoalProgress(goal: PrepGoal, sessions: PrepSession[], days: WeeklyPrepDay[]) {
  if (goal.id === "followUps") return goal.current;
  const visibleDates = new Set(days.map((day) => day.date));
  return sessions.filter(
    (session) => session.type === goal.id && visibleDates.has(localDateKey(new Date(session.completedAt))),
  ).length;
}

export function calculateStreak(days: WeeklyPrepDay[]) {
  const active = [...days].reverse().map((day) => day.coding + day.behavioral + day.systemDesign > 0);
  const start = active[0] ? 0 : 1;
  let streak = 0;
  for (let index = start; index < active.length && active[index]; index += 1) streak += 1;
  return streak;
}

export function completionPercent(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timestampId(value: string) {
  return value.replace(/[^0-9]/g, "");
}
