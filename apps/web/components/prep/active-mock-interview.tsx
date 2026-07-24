"use client";

import { ChevronDown, Loader2, LogOut, Send } from "lucide-react";
import type { MockInterviewEvaluation, MockInterviewSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function ActiveMockInterview({
  session,
  answer,
  busy,
  error,
  feedback,
  confirmAbandon,
  onAnswerChange,
  onSubmit,
  onRequestAbandon,
  onCancelAbandon,
  onConfirmAbandon,
}: {
  session: MockInterviewSession;
  answer: string;
  busy: boolean;
  error: string;
  feedback?: MockInterviewEvaluation;
  confirmAbandon: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onRequestAbandon: () => void;
  onCancelAbandon: () => void;
  onConfirmAbandon: () => void;
}) {
  const turns = session.turns ?? [];
  const question = [...turns].reverse().find((turn) => turn.speaker === "interviewer");
  const progress = Math.round(session.currentQuestionIndex / session.questionCount * 100);
  return (
    <div className="min-h-[calc(100dvh-12rem)] rounded-xl border border-slate-700/45 bg-[#1b1d2b]">
      <header className="flex flex-col gap-4 border-b border-slate-700/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-indigo-200/70">{label(session.interviewType)} interview</div>
          <h2 className="mt-1 text-lg font-semibold text-white">{session.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{session.difficulty} · question {Math.min(session.currentQuestionIndex + 1, session.questionCount)} of {session.questionCount}</p>
        </div>
        {!confirmAbandon ? <Button disabled={busy} onClick={onRequestAbandon} variant="ghost"><LogOut className="size-4" />End interview</Button> : <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-amber-200">End and mark this session abandoned?</span><Button onClick={onCancelAbandon} variant="ghost">Keep practicing</Button><Button onClick={onConfirmAbandon} variant="secondary">End session</Button></div>}
      </header>
      <Progress className="rounded-none border-0" value={progress} />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-wrap gap-2">
          {session.contextSources.map((source) => <span className="rounded-md border border-slate-700/40 bg-slate-900/30 px-2 py-1 text-[11px] text-slate-400" key={source}>{source}</span>)}
          {session.provider === "mock" ? <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-200">Simulated locally</span> : null}
        </div>
        <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045] p-5 sm:p-7">
          <div className="text-xs font-medium uppercase text-indigo-200/70">{question?.questionType?.replace("_", " ") || session.interviewType}</div>
          <p className="mt-3 text-xl font-medium leading-8 text-white sm:text-2xl">{question?.content}</p>
        </section>
        {feedback ? <section className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4"><div className="text-xs font-semibold uppercase text-emerald-200/70">Feedback on your previous answer</div><p className="mt-2 text-sm leading-6 text-slate-300">{feedback.summary}</p>{feedback.strengths.length ? <p className="mt-2 text-xs text-emerald-200">{feedback.strengths[0]}</p> : null}{feedback.weaknesses.length ? <p className="mt-1 text-xs text-amber-200">{feedback.weaknesses[0]}</p> : null}</section> : null}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Your answer</span>
          <textarea
            aria-label="Mock interview answer"
            className="min-h-52 w-full resize-y rounded-xl border border-slate-700/55 bg-slate-950/35 p-4 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15"
            disabled={busy}
            placeholder="Explain your reasoning, decisions, tradeoffs, and results..."
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
          />
        </label>
        {error ? <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">{error}</div> : null}
        <div className="flex justify-end">
          <Button disabled={busy || !answer.trim()} onClick={onSubmit} variant="primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{busy ? "Evaluating answer..." : "Submit answer"}</Button>
        </div>
        {turns.length > 2 ? <details className="border-t border-slate-700/30 pt-5"><summary className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">Previous questions <ChevronDown className="size-4" /></summary><div className="mt-4 space-y-3">{turns.slice(0, -1).filter((turn) => turn.speaker === "interviewer").map((turn) => <div className="rounded-lg border border-slate-700/35 bg-slate-950/20 p-3 text-sm text-slate-400" key={turn.id}>{turn.content}</div>)}</div></details> : null}
      </main>
    </div>
  );
}

function label(value: string) {
  return value === "system_design" ? "System design" : value.charAt(0).toUpperCase() + value.slice(1);
}
