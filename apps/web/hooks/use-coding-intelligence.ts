"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/data/api/apiClient";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";
import { announceDataChange } from "@/lib/data/repositories/events";

export type CodingActivity = { id: string; problemTitle: string; problemUrl: string; difficulty: "easy" | "medium" | "hard"; topics: string[]; status: "solved" | "attempted" | "review"; solvedAt: string; attemptedAt: string; timeSpentMinutes: number; notes: string; source: string; createdAt: string };
export type CodingProfile = { provider: "leetcode"; username: string; profileUrl: string; connectionStatus: string; syncStatus: string; lastSyncedAt: string; lastSyncError: string };
export type CodingGoal = { targetProblems: number; targetMinutes: number; difficultyTarget: "easy" | "medium" | "hard" | "" };
export type CodingSummary = { totalSolved: number; difficultyBreakdown: Record<string, number>; completedThisWeek: number; currentStreak: number; timeSpentThisWeek: number; topicCoverage: Record<string, number>; recentActivity: CodingActivity[]; goal: CodingGoal | null };
export type ActivityInput = Omit<CodingActivity, "id" | "source" | "createdAt">;

const LOCAL_KEY = "offeros:coding-intelligence";
const emptySummary: CodingSummary = { totalSolved: 0, difficultyBreakdown: { easy: 0, medium: 0, hard: 0 }, completedThisWeek: 0, currentStreak: 0, timeSpentThisWeek: 0, topicCoverage: {}, recentActivity: [], goal: null };

export function useCodingIntelligence() {
  const [profile, setProfile] = useState<CodingProfile | null>(null);
  const [activities, setActivities] = useState<CodingActivity[]>([]);
  const [summary, setSummary] = useState<CodingSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      if (dataMode === "local") {
        const local = readLocal();
        setProfile(local.profile); setActivities(local.activities); setSummary(summarize(local.activities, local.goal));
      } else {
        const [profileResponse, summaryResponse, activityResponse] = await Promise.all([
          apiClient.get<{ data: ApiProfile | null }>("/prep/coding-profile"),
          apiClient.get<{ data: ApiSummary }>("/prep/coding-summary"),
          apiClient.get<{ data: { items: ApiActivity[] } }>("/prep/coding-activities?limit=30"),
        ]);
        setProfile(profileResponse.data ? fromProfile(profileResponse.data) : null);
        setSummary(fromSummary(summaryResponse.data));
        setActivities(activityResponse.data.items.map(fromActivity));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load coding activity."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    window.queueMicrotask(() => { void refresh(); });
  }, [refresh]);

  const connect = useCallback(async (username: string) => {
    if (dataMode === "local") {
      const local = readLocal();
      const normalized = username.trim().replace(/^@/, "");
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(normalized)) throw new Error("Enter a valid LeetCode username.");
      local.profile = { provider: "leetcode", username: normalized, profileUrl: `https://leetcode.com/u/${normalized}/`, connectionStatus: "connected", syncStatus: "unsupported", lastSyncedAt: "", lastSyncError: "Automatic sync is unavailable in local mode." };
      writeLocal(local); await refresh(); return local.profile;
    }
    const response = await apiClient.post<{ data: ApiProfile }>("/prep/coding-profile/connect", { provider: "leetcode", username });
    const next = fromProfile(response.data); setProfile(next); return next;
  }, [refresh]);

  const sync = useCallback(async () => {
    if (dataMode === "local") return { status: "unsupported", message: "Automatic sync is unavailable in local mode." };
    const response = await apiClient.post<{ data: { status: string; message: string } }>("/prep/coding-profile/sync", {});
    await refresh(); return response.data;
  }, [refresh]);

  const disconnect = useCallback(async () => {
    if (dataMode === "local") { const local = readLocal(); local.profile = null; writeLocal(local); await refresh(); return; }
    await apiClient.delete("/prep/coding-profile"); await refresh();
  }, [refresh]);

  const createActivity = useCallback(async (input: ActivityInput) => {
    if (dataMode === "local") {
      const local = readLocal();
      const duplicate = local.activities.some((item) => item.problemTitle.toLowerCase() === input.problemTitle.trim().toLowerCase() && (item.solvedAt || item.attemptedAt) === (input.solvedAt || input.attemptedAt));
      if (duplicate) throw new Error("This coding activity is already in your history.");
      local.activities.unshift({ ...input, id: `coding-${Date.now()}`, source: "manual", createdAt: new Date().toISOString(), problemTitle: input.problemTitle.trim(), topics: input.topics.filter(Boolean) });
      writeLocal(local); await refresh(); return;
    }
    await apiClient.post("/prep/coding-activities", toActivity(input)); await refresh();
  }, [refresh]);

  const importActivities = useCallback(async (rows: ActivityInput[]) => {
    if (!rows.length) return { imported: 0, skippedDuplicates: 0, failed: 0 };
    if (dataMode === "local") {
      const local = readLocal();
      let imported = 0; let skippedDuplicates = 0;
      for (const row of rows) {
        const duplicate = local.activities.some((item) => item.problemTitle.toLowerCase() === row.problemTitle.trim().toLowerCase() && (item.solvedAt || item.attemptedAt) === (row.solvedAt || row.attemptedAt));
        if (duplicate) { skippedDuplicates += 1; continue; }
        local.activities.unshift({ ...row, id: `coding-${Date.now()}-${imported}`, source: "import", createdAt: new Date().toISOString(), problemTitle: row.problemTitle.trim(), topics: row.topics.filter(Boolean) });
        imported += 1;
      }
      writeLocal(local); await refresh(); return { imported, skippedDuplicates, failed: 0 };
    }
    const response = await apiClient.post<{ data: { imported: number; skipped_duplicates: number; failed: number } }>("/prep/coding-activities/import", { rows: rows.map(toActivity) });
    await refresh();
    return { imported: response.data.imported, skippedDuplicates: response.data.skipped_duplicates, failed: response.data.failed };
  }, [refresh]);

  const saveGoal = useCallback(async (goal: CodingGoal) => {
    if (dataMode === "local") { const local = readLocal(); local.goal = goal; writeLocal(local); await refresh(); return; }
    await apiClient.post("/prep/coding-goal", { target_problems: goal.targetProblems, target_minutes: goal.targetMinutes, difficulty_target: goal.difficultyTarget || null }); await refresh();
  }, [refresh]);

  return { profile, activities, summary, loading, error, connect, sync, disconnect, createActivity, importActivities, saveGoal, refresh, apiMode: dataMode === "api" };
}

type ApiProfile = { provider: "leetcode"; username: string; profile_url: string; connection_status: string; sync_status: string; last_synced_at: string | null; last_sync_error: string };
type ApiActivity = { id: string; problem_title: string; problem_url: string | null; difficulty: CodingActivity["difficulty"]; topics: string[]; status: CodingActivity["status"]; solved_at: string | null; attempted_at: string | null; time_spent_minutes: number | null; notes: string; source: string; created_at: string };
type ApiSummary = { total_solved: number; difficulty_breakdown: Record<string, number>; completed_this_week: number; current_streak: number; time_spent_this_week: number; topic_coverage: Record<string, number>; recent_activity: ApiActivity[]; goal: { target_problems: number; target_minutes: number; difficulty_target: CodingGoal["difficultyTarget"] | null } | null };

function fromProfile(value: ApiProfile): CodingProfile { return { provider: value.provider, username: value.username, profileUrl: value.profile_url, connectionStatus: value.connection_status, syncStatus: value.sync_status, lastSyncedAt: value.last_synced_at ?? "", lastSyncError: value.last_sync_error ?? "" }; }
function fromActivity(value: ApiActivity): CodingActivity { return { id: value.id, problemTitle: value.problem_title, problemUrl: value.problem_url ?? "", difficulty: value.difficulty, topics: Array.isArray(value.topics) ? value.topics : [], status: value.status, solvedAt: value.solved_at ?? "", attemptedAt: value.attempted_at ?? "", timeSpentMinutes: value.time_spent_minutes ?? 0, notes: value.notes ?? "", source: value.source, createdAt: value.created_at }; }
function fromSummary(value: ApiSummary): CodingSummary { return { totalSolved: value.total_solved, difficultyBreakdown: value.difficulty_breakdown, completedThisWeek: value.completed_this_week, currentStreak: value.current_streak, timeSpentThisWeek: value.time_spent_this_week, topicCoverage: value.topic_coverage, recentActivity: value.recent_activity.map(fromActivity), goal: value.goal ? { targetProblems: value.goal.target_problems, targetMinutes: value.goal.target_minutes, difficultyTarget: value.goal.difficulty_target ?? "" } : null }; }
function toActivity(value: ActivityInput) { return { problem_title: value.problemTitle, problem_url: value.problemUrl || null, difficulty: value.difficulty, topics: value.topics, status: value.status, solved_at: value.solvedAt || null, attempted_at: value.attemptedAt || null, time_spent_minutes: value.timeSpentMinutes || null, notes: value.notes }; }

type LocalData = { profile: CodingProfile | null; activities: CodingActivity[]; goal: CodingGoal | null };
function readLocal(): LocalData { if (typeof window === "undefined") return { profile: null, activities: [], goal: null }; try { const raw = window.localStorage.getItem(LOCAL_KEY); if (!raw) return { profile: null, activities: [], goal: null }; const value = JSON.parse(raw) as Partial<LocalData>; return { profile: value.profile ?? null, activities: Array.isArray(value.activities) ? value.activities : [], goal: value.goal ?? null }; } catch { return { profile: null, activities: [], goal: null }; } }
function writeLocal(value: LocalData) { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); announceDataChange(); }
function summarize(activities: CodingActivity[], goal: CodingGoal | null): CodingSummary { const solved = activities.filter((item) => item.status === "solved"); const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); const week = solved.filter((item) => new Date(item.solvedAt).getTime() >= weekStart.getTime()); const difficultyBreakdown = { easy: solved.filter((item) => item.difficulty === "easy").length, medium: solved.filter((item) => item.difficulty === "medium").length, hard: solved.filter((item) => item.difficulty === "hard").length }; const topicCoverage: Record<string, number> = {}; solved.forEach((item) => item.topics.forEach((topic) => { topicCoverage[topic] = (topicCoverage[topic] ?? 0) + 1; })); return { totalSolved: solved.length, difficultyBreakdown, completedThisWeek: week.length, currentStreak: streak(solved), timeSpentThisWeek: week.reduce((sum, item) => sum + (item.timeSpentMinutes || 0), 0), topicCoverage, recentActivity: activities.slice(0, 8), goal }; }
function streak(items: CodingActivity[]) { const days = new Set(items.filter((item) => item.solvedAt).map((item) => item.solvedAt.slice(0, 10))); let current = new Date(); current.setHours(0, 0, 0, 0); if (!days.has(current.toISOString().slice(0, 10))) current.setDate(current.getDate() - 1); let value = 0; while (days.has(current.toISOString().slice(0, 10))) { value += 1; current.setDate(current.getDate() - 1); } return value; }
