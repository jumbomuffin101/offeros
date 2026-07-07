"use client";

import { useEffect, useState } from "react";
import { Code2, RotateCcw } from "lucide-react";
import type { BehavioralQuestion, CodingProblem, PrepGoal, PrepStatus, SystemDesignPrompt } from "@/lib/types";
import { usePrep } from "@/hooks/use-prep";
import { BehavioralAnswerDrawer } from "@/components/prep/behavioral-answer-drawer";
import { BehavioralPracticeCard } from "@/components/prep/behavioral-practice-card";
import { CodingProblemModal, type CodingProblemPayload } from "@/components/prep/coding-problem-modal";
import { DailyCodingCard } from "@/components/prep/daily-coding-card";
import { PrepGoals } from "@/components/prep/prep-goals";
import { LeetCodePlaceholder } from "@/components/prep/leetcode-placeholder";
import { SystemDesignCard } from "@/components/prep/system-design-card";
import { SystemDesignModal, type SystemDesignPayload } from "@/components/prep/system-design-modal";
import { WeeklyProgress } from "@/components/prep/weekly-progress";
import { Button } from "@/components/ui/button";
import { DataErrorState } from "@/components/ui/data-error-state";
import { Toast } from "@/components/ui/toast";
import { WorkspaceSkeleton } from "@/components/ui/workspace-skeleton";
import { ESCAPE_EVENT, workspaceActions } from "@/lib/action-events";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

export function PrepWorkspace() {
  const prepData = usePrep();
  const data = prepData.data;
  const [codingOpen, setCodingOpen] = useState(false);
  const [editingCoding, setEditingCoding] = useState<CodingProblem | null>(null);
  const [behavioralOpen, setBehavioralOpen] = useState<BehavioralQuestion | null>(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemDesignPrompt | null>(null);
  const [toast, setToast] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      if (window.sessionStorage.getItem(workspaceActions.coding.storageKey)) { window.sessionStorage.removeItem(workspaceActions.coding.storageKey); setEditingCoding(null); setCodingOpen(true); }
      if (window.sessionStorage.getItem(workspaceActions.systemDesign.storageKey)) { window.sessionStorage.removeItem(workspaceActions.systemDesign.storageKey); setEditingSystem(null); setSystemOpen(true); }
    });
  }, []);
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

  async function changeCodingStatus(problem: CodingProblem, status: PrepStatus) {
    try {
      await prepData.setCodingStatus(problem.id, status);
      recordRecentlyViewed({ id: problem.id, type: "Prep", label: problem.title, detail: `${problem.topic} coding problem`, href: "/prep" });
      if (status === "Completed") setToast("Coding problem completed");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function saveCoding(payload: CodingProblemPayload) {
    try {
      await prepData.saveCoding(payload, editingCoding?.id);
      setToast(editingCoding ? "Coding problem updated" : "Coding problem saved");
      setCodingOpen(false); setEditingCoding(null);
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function changeBehavioralStatus(question: BehavioralQuestion, status: PrepStatus) {
    try {
      await prepData.setBehavioralStatus(question.id, status);
      recordRecentlyViewed({ id: question.id, type: "Prep", label: question.question, detail: "Behavioral practice", href: "/prep" });
      if (status === "Completed") setToast("Behavioral answer completed");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function saveBehavioral(question: BehavioralQuestion) {
    try {
      await prepData.saveBehavioral(question);
      recordRecentlyViewed({ id: question.id, type: "Prep", label: question.question, detail: "Behavioral practice", href: "/prep" });
      setBehavioralOpen(null); setToast(question.status === "Completed" ? "Behavioral answer completed" : "Behavioral answer saved");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function changeSystemStatus(prompt: SystemDesignPrompt, status: PrepStatus) {
    try {
      await prepData.setSystemDesignStatus(prompt.id, status);
      recordRecentlyViewed({ id: prompt.id, type: "Prep", label: prompt.title, detail: "System design prompt", href: "/prep" });
      if (status === "Completed") setToast("System design prompt completed");
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function saveSystem(payload: SystemDesignPayload) {
    try {
      await prepData.saveSystemDesign(payload, editingSystem?.id);
      setToast(editingSystem ? "System design prompt updated." : "System design prompt added.");
      setSystemOpen(false); setEditingSystem(null);
    } catch { /* Hook exposes the typed error state. */ }
  }

  async function saveGoals(goals: PrepGoal[]) { try { await prepData.saveGoals(goals); setToast("Prep goal updated"); } catch { /* Hook exposes the typed error state. */ } }
  async function resetDemo() {
    if (resetting) return;
    setResetting(true);
    try { await prepData.reset(); setEditingCoding(null); setBehavioralOpen(null); setEditingSystem(null); setToast("Prep demo data restored."); }
    catch (cause) { setToast(cause instanceof Error ? cause.message : "Unable to reset prep."); }
    finally { setResetting(false); }
  }

  if (prepData.error) return <DataErrorState error={prepData.error} onRetry={() => void prepData.refresh()} />;
  if (prepData.loading || !data) return <WorkspaceSkeleton cards={5} />;
  const isEmpty = !data.codingProblems.length && !data.behavioralQuestions.length && !data.systemDesignPrompts.length && !data.sessions.length;

  return <div className="space-y-5">
    <div className="flex justify-end"><Button disabled={resetting} onClick={resetDemo} variant="ghost"><RotateCcw className="size-4" />{resetting ? "Resetting..." : "Reset prep demo data"}</Button></div>
    {isEmpty ? <div className="rounded-xl border border-dashed border-slate-700/45 bg-slate-900/20 px-6 py-16 text-center"><Code2 className="mx-auto size-7 text-indigo-300" /><h2 className="mt-4 text-lg font-semibold text-white">No prep history yet</h2><p className="mt-2 text-sm text-slate-500">Start with one focused problem and build a technical interview practice rhythm.</p><Button className="mt-5" onClick={() => setCodingOpen(true)} variant="primary"><Code2 className="size-4" />Start today&apos;s coding problem</Button></div> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><div className="space-y-6"><DailyCodingCard problems={data.codingProblems} onAdd={() => { setEditingCoding(null); setCodingOpen(true); }} onEdit={(problem) => { setEditingCoding(problem); recordRecentlyViewed({ id: problem.id, type: "Prep", label: problem.title, detail: `${problem.topic} coding problem`, href: "/prep" }); setCodingOpen(true); }} onStatus={changeCodingStatus} /><BehavioralPracticeCard questions={data.behavioralQuestions} onEdit={(question) => { recordRecentlyViewed({ id: question.id, type: "Prep", label: question.question, detail: "Behavioral practice", href: "/prep" }); setBehavioralOpen(question); }} onStatus={changeBehavioralStatus} /><SystemDesignCard prompts={data.systemDesignPrompts} onAdd={() => { setEditingSystem(null); setSystemOpen(true); }} onEdit={(prompt) => { recordRecentlyViewed({ id: prompt.id, type: "Prep", label: prompt.title, detail: "System design prompt", href: "/prep" }); setEditingSystem(prompt); setSystemOpen(true); }} onStatus={changeSystemStatus} /></div><aside className="space-y-6"><WeeklyProgress days={data.weeklyDays} sessions={data.sessions} /><PrepGoals days={data.weeklyDays} goals={data.goals} sessions={data.sessions} onSave={saveGoals} /></aside></div>}
    <LeetCodePlaceholder />
    <CodingProblemModal open={codingOpen} problem={editingCoding} onClose={() => { setCodingOpen(false); setEditingCoding(null); }} onSubmit={saveCoding} />
    <BehavioralAnswerDrawer question={behavioralOpen} onClose={() => setBehavioralOpen(null)} onSave={saveBehavioral} />
    <SystemDesignModal open={systemOpen} designPrompt={editingSystem} onClose={() => { setSystemOpen(false); setEditingSystem(null); }} onSubmit={saveSystem} />
    <Toast message={toast} />
  </div>;
}
