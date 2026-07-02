"use client";

import { useEffect, useState } from "react";
import { Code2, RotateCcw } from "lucide-react";
import type { BehavioralQuestion, CodingProblem, PrepGoal, PrepStatus, PrepWorkspaceData, SystemDesignPrompt } from "@/lib/types";
import { timestampId, updateCompletion } from "@/lib/prep-utils";
import { loadStoredPrep, resetStoredPrep, saveStoredPrep } from "@/lib/prep-storage";
import { BehavioralAnswerDrawer } from "@/components/prep/behavioral-answer-drawer";
import { BehavioralPracticeCard } from "@/components/prep/behavioral-practice-card";
import { CodingProblemModal, type CodingProblemPayload } from "@/components/prep/coding-problem-modal";
import { DailyCodingCard } from "@/components/prep/daily-coding-card";
import { PrepGoals } from "@/components/prep/prep-goals";
import { SystemDesignCard } from "@/components/prep/system-design-card";
import { SystemDesignModal, type SystemDesignPayload } from "@/components/prep/system-design-modal";
import { WeeklyProgress } from "@/components/prep/weekly-progress";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { ESCAPE_EVENT, workspaceActions } from "@/lib/action-events";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

export function PrepWorkspace({ initialData }: { initialData: PrepWorkspaceData }) {
  const [data, setData] = useState(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [codingOpen, setCodingOpen] = useState(false);
  const [editingCoding, setEditingCoding] = useState<CodingProblem | null>(null);
  const [behavioralOpen, setBehavioralOpen] = useState<BehavioralQuestion | null>(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemDesignPrompt | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    window.queueMicrotask(() => {
      setData(loadStoredPrep(initialData)); setHydrated(true);
      if (window.sessionStorage.getItem(workspaceActions.coding.storageKey)) { window.sessionStorage.removeItem(workspaceActions.coding.storageKey); setEditingCoding(null); setCodingOpen(true); }
      if (window.sessionStorage.getItem(workspaceActions.systemDesign.storageKey)) { window.sessionStorage.removeItem(workspaceActions.systemDesign.storageKey); setEditingSystem(null); setSystemOpen(true); }
    });
  }, [initialData]);
  useEffect(() => {
    function openCoding() { window.sessionStorage.removeItem(workspaceActions.coding.storageKey); setEditingCoding(null); setCodingOpen(true); }
    function openSystem() { window.sessionStorage.removeItem(workspaceActions.systemDesign.storageKey); setEditingSystem(null); setSystemOpen(true); }
    function closeOverlays() { setCodingOpen(false); setEditingCoding(null); setBehavioralOpen(null); setSystemOpen(false); setEditingSystem(null); }
    window.addEventListener(workspaceActions.coding.event, openCoding);
    window.addEventListener(workspaceActions.systemDesign.event, openSystem);
    window.addEventListener(ESCAPE_EVENT, closeOverlays);
    return () => { window.removeEventListener(workspaceActions.coding.event, openCoding); window.removeEventListener(workspaceActions.systemDesign.event, openSystem); window.removeEventListener(ESCAPE_EVENT, closeOverlays); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function commit(next: PrepWorkspaceData) {
    setData(next);
    if (hydrated) saveStoredPrep(next);
  }

  function changeCodingStatus(problem: CodingProblem, status: PrepStatus) {
    const now = new Date().toISOString();
    const base = { ...data, codingProblems: data.codingProblems.map((item) => item.id === problem.id ? { ...item, status, completedAt: status === "Completed" ? now : "", updatedAt: now } : item) };
    commit(updateCompletion(base, problem.id, "coding", status, now));
    recordRecentlyViewed({ id: problem.id, type: "Prep", label: problem.title, detail: `${problem.topic} coding problem`, href: "/prep" });
    if (status === "Completed") setToast("Coding problem completed");
  }

  function saveCoding(payload: CodingProblemPayload) {
    const now = new Date().toISOString();
    if (editingCoding) {
      const completedAt = payload.status === "Completed" ? editingCoding.completedAt || now : "";
      const base = { ...data, codingProblems: data.codingProblems.map((problem) => problem.id === editingCoding.id ? { ...problem, ...payload, completedAt, updatedAt: now } : problem) };
      commit(updateCompletion(base, editingCoding.id, "coding", payload.status, completedAt || now));
      setToast("Coding problem updated");
    } else {
      const id = `coding-${timestampId(now)}`;
      const problem: CodingProblem = { ...payload, id, completedAt: payload.status === "Completed" ? now : "", createdAt: now, updatedAt: now };
      const base = { ...data, codingProblems: [problem, ...data.codingProblems] };
      commit(updateCompletion(base, id, "coding", payload.status, now));
      setToast("Coding problem saved");
    }
    setCodingOpen(false); setEditingCoding(null);
  }

  function changeBehavioralStatus(question: BehavioralQuestion, status: PrepStatus) {
    saveBehavioral({ ...question, status });
  }

  function saveBehavioral(question: BehavioralQuestion) {
    const now = new Date().toISOString();
    const updated = { ...question, updatedAt: now };
    const base = { ...data, behavioralQuestions: data.behavioralQuestions.map((item) => item.id === question.id ? updated : item) };
    commit(updateCompletion(base, question.id, "behavioral", question.status, now));
    recordRecentlyViewed({ id: question.id, type: "Prep", label: question.question, detail: "Behavioral practice", href: "/prep" });
    setBehavioralOpen(null); setToast(question.status === "Completed" ? "Behavioral answer completed" : "Behavioral answer saved");
  }

  function changeSystemStatus(prompt: SystemDesignPrompt, status: PrepStatus) {
    const now = new Date().toISOString();
    const base = { ...data, systemDesignPrompts: data.systemDesignPrompts.map((item) => item.id === prompt.id ? { ...item, status, updatedAt: now } : item) };
    commit(updateCompletion(base, prompt.id, "systemDesign", status, now));
    recordRecentlyViewed({ id: prompt.id, type: "Prep", label: prompt.title, detail: "System design prompt", href: "/prep" });
    if (status === "Completed") setToast("System design prompt completed");
  }

  function saveSystem(payload: SystemDesignPayload) {
    const now = new Date().toISOString();
    if (editingSystem) {
      const base = { ...data, systemDesignPrompts: data.systemDesignPrompts.map((prompt) => prompt.id === editingSystem.id ? { ...prompt, ...payload, updatedAt: now } : prompt) };
      commit(updateCompletion(base, editingSystem.id, "systemDesign", payload.status, now));
      setToast("System design prompt updated.");
    } else {
      const id = `system-${timestampId(now)}`;
      const prompt: SystemDesignPrompt = { ...payload, id, createdAt: now, updatedAt: now };
      const base = { ...data, systemDesignPrompts: [prompt, ...data.systemDesignPrompts] };
      commit(updateCompletion(base, id, "systemDesign", payload.status, now));
      setToast("System design prompt added.");
    }
    setSystemOpen(false); setEditingSystem(null);
  }

  function saveGoals(goals: PrepGoal[]) { commit({ ...data, goals }); setToast("Prep goal updated"); }
  function resetDemo() { setData(resetStoredPrep(initialData)); setEditingCoding(null); setBehavioralOpen(null); setEditingSystem(null); setToast("Prep demo data restored."); }

  if (!hydrated) return <WorkspaceSkeleton cards={5} />;
  const isEmpty = !data.codingProblems.length && !data.behavioralQuestions.length && !data.systemDesignPrompts.length && !data.sessions.length;

  return <div className="space-y-5">
    <div className="flex justify-end"><Button onClick={resetDemo} variant="ghost"><RotateCcw className="size-4" />Reset prep demo data</Button></div>
    {isEmpty ? <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><Code2 className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">No prep history yet</h2><p className="mt-2 text-sm text-slate-500">Start with one focused problem and build a practice rhythm from there.</p><Button className="mt-5" onClick={() => setCodingOpen(true)} variant="primary"><Code2 className="size-4" />Start today&apos;s coding problem</Button></div> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><div className="space-y-6"><DailyCodingCard problems={data.codingProblems} onAdd={() => { setEditingCoding(null); setCodingOpen(true); }} onEdit={(problem) => { setEditingCoding(problem); recordRecentlyViewed({ id: problem.id, type: "Prep", label: problem.title, detail: `${problem.topic} coding problem`, href: "/prep" }); setCodingOpen(true); }} onStatus={changeCodingStatus} /><BehavioralPracticeCard questions={data.behavioralQuestions} onEdit={(question) => { recordRecentlyViewed({ id: question.id, type: "Prep", label: question.question, detail: "Behavioral practice", href: "/prep" }); setBehavioralOpen(question); }} onStatus={changeBehavioralStatus} /><SystemDesignCard prompts={data.systemDesignPrompts} onAdd={() => { setEditingSystem(null); setSystemOpen(true); }} onEdit={(prompt) => { recordRecentlyViewed({ id: prompt.id, type: "Prep", label: prompt.title, detail: "System design prompt", href: "/prep" }); setEditingSystem(prompt); setSystemOpen(true); }} onStatus={changeSystemStatus} /></div><aside className="space-y-6"><WeeklyProgress days={data.weeklyDays} sessions={data.sessions} /><PrepGoals days={data.weeklyDays} goals={data.goals} sessions={data.sessions} onSave={saveGoals} /></aside></div>}
    <CodingProblemModal open={codingOpen} problem={editingCoding} onClose={() => { setCodingOpen(false); setEditingCoding(null); }} onSubmit={saveCoding} />
    <BehavioralAnswerDrawer question={behavioralOpen} onClose={() => setBehavioralOpen(null)} onSave={saveBehavioral} />
    <SystemDesignModal open={systemOpen} designPrompt={editingSystem} onClose={() => { setSystemOpen(false); setEditingSystem(null); }} onSubmit={saveSystem} />
    <Toast message={toast} />
  </div>;
}
