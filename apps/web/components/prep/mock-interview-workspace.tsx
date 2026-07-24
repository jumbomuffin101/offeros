"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Loader2, Play, RotateCcw } from "lucide-react";
import type {
  MockInterviewEvaluation,
  MockInterviewSession,
  MockInterviewType,
} from "@/lib/types";
import type { MockInterviewCreateInput } from "@/lib/data/types";
import { useApplications } from "@/hooks/use-applications";
import { useMockInterviews } from "@/hooks/use-mock-interviews";
import { useResumes } from "@/hooks/use-resumes";
import { ActiveMockInterview } from "@/components/prep/active-mock-interview";
import { MockInterviewConfig } from "@/components/prep/mock-interview-config";
import { MockInterviewScorecardView } from "@/components/prep/mock-interview-scorecard";
import { Button } from "@/components/ui/button";
import { DataErrorState } from "@/components/ui/data-error-state";
import { prepRepository } from "@/lib/data/repositories/repositoryFactory";
import { announceDataChange } from "@/lib/data/repositories/events";

const defaultConfig: MockInterviewCreateInput = {
  interviewType: "mixed",
  difficulty: "standard",
  questionCount: 5,
};

export function MockInterviewWorkspace() {
  const interviews = useMockInterviews();
  const applicationData = useApplications();
  const resumeData = useResumes();
  const [config, setConfig] = useState(defaultConfig);
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<MockInterviewEvaluation>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const applicationId = params.get("application") ?? undefined;
    const resumeVersionId = params.get("resume") ?? undefined;
    const requestedSession = params.get("session");
    window.queueMicrotask(() => {
      setConfig((current) => ({ ...current, applicationId, resumeVersionId }));
      if (requestedSession) void openSession(requestedSession);
    });
    // Query parameters are a one-time launch context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session?.status !== "active") return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [session?.status]);

  async function start(input = config) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await interviews.create(input);
      setSession(result.session);
      updateSessionUrl(result.session.id);
      setAnswer("");
      setFeedback(undefined);
    } catch (cause) {
      setError(messageFor(cause, "OfferOS could not start the mock interview."));
    } finally {
      setBusy(false);
    }
  }

  async function openSession(id: string) {
    setBusy(true);
    setError("");
    try {
      const value = await interviews.get(id);
      if (!value) throw new Error("Mock interview was not found.");
      setSession(value);
      updateSessionUrl(value.id);
      setConfig({
        applicationId: value.applicationId,
        resumeVersionId: value.resumeVersionId,
        interviewType: value.interviewType,
        difficulty: value.difficulty,
        questionCount: value.questionCount,
      });
      setAnswer("");
      setFeedback(undefined);
    } catch (cause) {
      setError(messageFor(cause, "Unable to open this mock interview."));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!session || !answer.trim()) {
      setError("Enter an answer before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await interviews.answer(
        session.id,
        answer.trim(),
        crypto.randomUUID(),
      );
      setSession(result.session);
      setFeedback(result.evaluation);
      setAnswer("");
    } catch (cause) {
      setError(messageFor(cause, "OfferOS could not evaluate this answer."));
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (!session) return;
    setBusy(true);
    try {
      await interviews.abandon(session.id);
      setSession(null);
      updateSessionUrl();
      setConfirmAbandon(false);
    } catch (cause) {
      setError(messageFor(cause, "Unable to end this interview."));
    } finally {
      setBusy(false);
    }
  }

  async function saveRecommendedAction() {
    if (!session?.scorecard?.recommendedActions.length) return;
    const action = session.scorecard.recommendedActions[0];
    setBusy(true);
    setError("");
    try {
      await createPrepAction(session.interviewType, action);
      announceDataChange();
      setMessage("Recommended action saved to Prep.");
    } catch (cause) {
      setError(messageFor(cause, "Unable to save the recommended prep action."));
    } finally {
      setBusy(false);
    }
  }

  if (interviews.error && !interviews.sessions.length) {
    return <DataErrorState error={interviews.error} onRetry={() => void interviews.refresh()} />;
  }
  if (session?.status === "completed" && session.scorecard) {
    return <><MockInterviewScorecardView session={session} onBack={() => { setSession(null); updateSessionUrl(); }} onRetry={() => void start({
      applicationId: session.applicationId,
      resumeVersionId: session.resumeVersionId,
      interviewType: session.interviewType,
      difficulty: session.difficulty,
      questionCount: session.questionCount,
    })} onSaveActions={() => void saveRecommendedAction()} />{message ? <Notice message={message} /> : null}{error ? <ErrorNotice message={error} /> : null}</>;
  }
  if (session?.status === "active") {
    return <ActiveMockInterview
      answer={answer}
      busy={busy}
      confirmAbandon={confirmAbandon}
      error={error}
      feedback={feedback}
      session={session}
      onAnswerChange={setAnswer}
      onCancelAbandon={() => setConfirmAbandon(false)}
      onConfirmAbandon={() => void abandon()}
      onRequestAbandon={() => setConfirmAbandon(true)}
      onSubmit={() => void submitAnswer()}
    />;
  }

  return (
    <div className="space-y-5">
      <MockInterviewConfig
        applications={applicationData.applications}
        busy={busy}
        resumes={resumeData.resumes}
        value={config}
        onChange={setConfig}
        onStart={() => void start()}
      />
      {error ? <ErrorNotice message={error} /> : null}
      <section className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-white">Recent sessions</h2><p className="mt-1 text-sm text-slate-500">Resume active practice or review a completed scorecard.</p></div>
          {interviews.loading ? <Loader2 className="size-4 animate-spin text-slate-500" /> : null}
        </div>
        {interviews.sessions.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {interviews.sessions.map((item) => (
            <button className="group flex w-full items-center justify-between gap-4 rounded-xl border border-slate-700/40 bg-slate-950/20 p-4 text-left transition hover:border-slate-600/60 hover:bg-slate-900/40" key={item.id} onClick={() => void openSession(item.id)} type="button">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-white">{item.title}</span><Status value={item.status} /></div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{typeLabel(item.interviewType)}</span><span>{item.difficulty}</span><span className="flex items-center gap-1"><Clock3 className="size-3" />{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.startedAt))}</span></div>
              </div>
              <div className="flex shrink-0 items-center gap-3">{typeof item.overallScore === "number" ? <span className="text-2xl font-semibold text-white">{item.overallScore}</span> : item.status === "active" ? <span className="flex items-center gap-1 text-xs text-indigo-200"><Play className="size-3" />Resume</span> : null}<ArrowRight className="size-4 text-slate-600 transition group-hover:text-slate-300" /></div>
            </button>
          ))}
        </div> : <div className="mt-5 rounded-xl border border-dashed border-slate-700/45 px-5 py-10 text-center"><RotateCcw className="mx-auto size-6 text-indigo-300" /><p className="mt-3 text-sm font-medium text-slate-200">No mock interviews yet</p><p className="mt-1 text-sm text-slate-500">Configure a focused practice session above.</p></div>}
      </section>
    </div>
  );
}

async function createPrepAction(type: MockInterviewType, action: string) {
  if (type === "system_design") {
    return prepRepository.create({ type: "systemDesign", value: { title: action.slice(0, 120), prompt: action, concepts: [], status: "Not Started", notes: "Recommended by Mock Interview." } });
  }
  if (type === "behavioral" || type === "resume") {
    return prepRepository.create({ type: "behavioral", value: { question: action, category: "Mock interview follow-up", starSituation: "", starTask: "", starAction: "", starResult: "", confidenceScore: 1, status: "Not Started" } });
  }
  return prepRepository.create({ type: "coding", value: { title: action.slice(0, 120), difficulty: "Medium", topic: "Mock interview gap", targetTimeMinutes: 35, status: "Not Started", notes: action, link: "" } });
}

function Status({ value }: { value: MockInterviewSession["status"] }) {
  const tone = value === "completed" ? "bg-emerald-300/10 text-emerald-200" : value === "active" ? "bg-indigo-300/10 text-indigo-200" : "bg-slate-700/40 text-slate-400";
  return <span className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize ${tone}`}>{value}</span>;
}
function typeLabel(value: MockInterviewType) { return value === "system_design" ? "System design" : value.charAt(0).toUpperCase() + value.slice(1); }
function messageFor(cause: unknown, fallback: string) { return cause instanceof Error && cause.message ? cause.message : fallback; }
function ErrorNotice({ message }: { message: string }) { return <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-100">{message}</div>; }
function Notice({ message }: { message: string }) { return <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100">{message}</div>; }
function updateSessionUrl(sessionId?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", "mock-interviews");
  if (sessionId) url.searchParams.set("session", sessionId);
  else url.searchParams.delete("session");
  window.history.replaceState(null, "", url);
}
