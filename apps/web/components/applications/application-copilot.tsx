"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApplicationCopilot } from "@/hooks/use-application-copilot";

const quickPrompts = [
  ["Assess my fit", "Assess how competitive I am for this role. Separate saved facts from inference and prioritize the three most important actions."],
  ["Biggest resume gaps", "What are the biggest verified gaps between my selected resume and this job description? Do not invent missing experience."],
  ["Interview prep focus", "What should I prioritize before the next interview based on this application, my resume analysis, prep plan, and prep history?"],
  ["Recruiter follow-up", "Draft a concise recruiter follow-up appropriate for my current application stage and most recent recruiting event."],
  ["Questions to ask", "Give me five thoughtful questions to ask the recruiter or interviewer for this specific role."],
  ["Summarize role", "Summarize this role, its most important requirements, and the likely evidence I should emphasize."],
] as const;

export function ApplicationCopilot({
  applicationId,
  defaultContextSources,
  onBeforeSend,
}: {
  applicationId: string;
  defaultContextSources: string[];
  onBeforeSend?: () => Promise<unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const copilot = useApplicationCopilot(applicationId, expanded);

  useEffect(() => {
    if (!expanded) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [copilot.messages, copilot.sending, expanded]);

  async function send(content = input) {
    if (!content.trim() || copilot.sending || copilot.loading) return;
    setInput("");
    try {
      await onBeforeSend?.();
      await copilot.send(content);
    } catch {
      setInput(content);
    }
  }

  async function copyMessage(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      setCopiedId("");
    }
  }

  const lastUserMessage = [...copilot.messages].reverse().find((message) => message.role === "user");
  const contextSources = copilot.contextSources.length
    ? copilot.contextSources
    : defaultContextSources;

  return (
    <section className="rounded-xl border border-indigo-300/15 bg-indigo-300/[0.045]">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-300/20 bg-indigo-300/10 text-indigo-200">
            <Bot className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase text-indigo-200/70">AI Recruiter Copilot</span>
            <span className="mt-1 block text-sm text-slate-400">Application-grounded recruiting guidance</span>
          </span>
        </span>
        {expanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
      </button>

      {expanded ? (
        <div className="border-t border-indigo-300/10 p-4">
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map(([label, prompt]) => (
              <button
                className="rounded-lg border border-slate-700/50 bg-slate-950/25 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-indigo-300/30 hover:text-indigo-100 disabled:opacity-50"
                disabled={copilot.sending || copilot.loading}
                key={label}
                onClick={() => void send(prompt)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-slate-700/35 bg-slate-950/20 px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-slate-500">Using context from</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {contextSources.map((source) => (
                <span className="rounded-md bg-slate-800/65 px-2 py-1 text-[11px] text-slate-300" key={source}>{source}</span>
              ))}
            </div>
          </div>

          <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1" ref={scrollRef}>
            {copilot.loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" />Loading conversation...</div>
            ) : copilot.messages.length ? copilot.messages.map((message) => (
              <div
                className={`rounded-lg border p-3 text-sm leading-6 ${message.role === "assistant" ? "border-slate-700/40 bg-slate-950/25 text-slate-200" : "ml-6 border-indigo-300/15 bg-indigo-300/[0.06] text-indigo-50"}`}
                key={message.id}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.role === "assistant" ? (
                  <button
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200"
                    onClick={() => void copyMessage(message.id, message.content)}
                    type="button"
                  >
                    <Clipboard className="size-3.5" />{copiedId === message.id ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
            )) : (
              <div className="py-6 text-sm leading-6 text-slate-400">
                Ask about role fit, resume gaps, interview priorities, or a recruiter follow-up.
              </div>
            )}
            {copilot.sending ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-950/25 p-3 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" />Reviewing application context...
              </div>
            ) : null}
          </div>

          {copilot.error ? (
            <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[0.08] p-3 text-sm text-rose-100">
              <p>{copilot.error}</p>
              <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium" onClick={() => void copilot.refresh()} type="button"><RefreshCw className="size-3.5" />Retry</button>
            </div>
          ) : null}

          <div className="mt-3">
            <label className="sr-only" htmlFor={`copilot-${applicationId}`}>Ask Recruiter Copilot</label>
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-300/50 focus:ring-2 focus:ring-indigo-300/10"
              disabled={copilot.sending || copilot.loading}
              id={`copilot-${applicationId}`}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void send();
              }}
              placeholder="Ask about this application..."
              value={input}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {lastUserMessage ? (
                  <Button disabled={copilot.sending} onClick={() => void send(lastUserMessage.content)} variant="ghost"><RefreshCw className="size-4" />Regenerate</Button>
                ) : null}
                {copilot.messages.length ? (
                  <Button disabled={copilot.sending} onClick={() => void copilot.clear()} variant="ghost"><Trash2 className="size-4" />Clear</Button>
                ) : null}
              </div>
              <Button disabled={copilot.sending || copilot.loading || !input.trim()} onClick={() => void send()} variant="primary">
                {copilot.sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {copilot.sending ? "Thinking..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
