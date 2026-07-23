"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApplicationCopilotMessage } from "@/lib/types";
import { applicationCopilotRepository } from "@/lib/data/repositories/repositoryFactory";

export function useApplicationCopilot(applicationId: string, enabled: boolean) {
  const [messages, setMessages] = useState<ApplicationCopilotMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [contextSources, setContextSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await applicationCopilotRepository.history(applicationId);
      if (sequence !== requestSequence.current) return;
      setMessages(result.messages);
      setConversationId(result.conversationId);
      setContextSources(result.contextSources);
    } catch (cause) {
      if (sequence === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load Recruiter Copilot.");
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!enabled) return;
    window.queueMicrotask(() => void refresh());
    return () => { requestSequence.current += 1; };
  }, [enabled, refresh]);

  const send = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    const userMessage: ApplicationCopilotMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    try {
      const result = await applicationCopilotRepository.send(applicationId, {
        message: trimmed,
        conversationId,
      });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, result.message]);
    } catch (cause) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setError(cause instanceof Error ? cause.message : "Recruiter Copilot could not respond.");
      throw cause;
    } finally {
      setSending(false);
    }
  }, [applicationId, conversationId, sending]);

  const clear = useCallback(async () => {
    setError("");
    try {
      if (conversationId) {
        await applicationCopilotRepository.clear(applicationId, conversationId);
      }
      setMessages([]);
      setConversationId(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to clear the Copilot conversation.");
    }
  }, [applicationId, conversationId]);

  return { messages, contextSources, loading, sending, error, send, clear, refresh };
}
