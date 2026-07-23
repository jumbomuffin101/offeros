"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicationEvent } from "@/lib/types";
import { applicationEventRepository } from "@/lib/data/repositories/repositoryFactory";

type EventInput = Omit<ApplicationEvent, "id" | "applicationId" | "completedAt" | "externalCalendarEventId" | "createdAt" | "updatedAt">;

export function useApplicationEvents(applicationId: string) {
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); try { setEvents(await applicationEventRepository.list(applicationId)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the recruiting timeline."); } finally { setLoading(false); } }, [applicationId]);
  useEffect(() => { window.queueMicrotask(() => void refresh()); }, [refresh]);
  const create = useCallback(async (input: EventInput) => { const event = await applicationEventRepository.create(applicationId, input); setEvents((current) => [...current, event].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))); return event; }, [applicationId]);
  const update = useCallback(async (id: string, input: Partial<ApplicationEvent>) => { const event = await applicationEventRepository.update(id, input); setEvents((current) => current.map((item) => item.id === id ? event : item).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))); return event; }, []);
  const remove = useCallback(async (id: string) => { await applicationEventRepository.delete(id); setEvents((current) => current.filter((item) => item.id !== id)); }, []);
  const addToCalendar = useCallback(async (id: string) => { const event = await applicationEventRepository.addToCalendar(id); setEvents((current) => current.map((item) => item.id === id ? event : item)); return event; }, []);
  return { events, loading, error, create, update, delete: remove, addToCalendar, refresh };
}
