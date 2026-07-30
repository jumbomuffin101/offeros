import type { ApplicationEventRepository } from "@/lib/data/types/repositories";
import type { ApplicationEvent, UpcomingRecruitingEvent } from "@/lib/types";
import { applications as demoApplications } from "@/lib/mock-data";
import { readApplications, writeApplications } from "@/lib/data/storage/local/applicationStorage";
import { readApplicationEvents, writeApplicationEvents } from "@/lib/data/storage/local/applicationEventStorage";

export const applicationEventRepository: ApplicationEventRepository = {
  async list(applicationId) { return readApplicationEvents().filter((event) => event.applicationId === applicationId).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)); },
  async create(applicationId, input) { const now = new Date().toISOString(); const event: ApplicationEvent = { ...input, id: crypto.randomUUID(), applicationId, completedAt: input.status === "completed" ? now : "", externalCalendarEventId: "", createdAt: now, updatedAt: now }; writeApplicationEvents([...readApplicationEvents(), event]); syncApplication(applicationId); return event; },
  async update(id, input) { const events = readApplicationEvents(); const current = events.find((event) => event.id === id); if (!current) throw new Error("Application event not found."); const next = { ...current, ...input, completedAt: input.status === "completed" ? current.completedAt || new Date().toISOString() : input.status ? "" : current.completedAt, updatedAt: new Date().toISOString() }; writeApplicationEvents(events.map((event) => event.id === id ? next : event)); syncApplication(current.applicationId); return next; },
  async delete(id) { const events = readApplicationEvents(); const current = events.find((event) => event.id === id); writeApplicationEvents(events.filter((event) => event.id !== id)); if (current) syncApplication(current.applicationId); },
  async addToCalendar() { throw new Error("Google Calendar is available in cloud API mode."); },
  async upcoming() { return upcomingLocal(); },
};

function syncApplication(applicationId: string) { const events = readApplicationEvents().filter((event) => event.applicationId === applicationId && event.status === "upcoming").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)); const next = events[0]; const applications = readApplications(demoApplications); writeApplications(applications.map((application) => application.id === applicationId ? { ...application, nextAction: next?.title ?? "", nextActionDueAt: next?.scheduledAt ?? "", nextEventType: next?.eventType ?? "" } : application)); }
function upcomingLocal(): UpcomingRecruitingEvent[] { const now = Date.now(), end = now + 14 * 86_400_000; const applications = new Map(readApplications(demoApplications).map((item) => [item.id, item])); return readApplicationEvents().filter((item) => item.status === "upcoming" && new Date(item.scheduledAt).getTime() >= now && new Date(item.scheduledAt).getTime() <= end).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).flatMap((event) => { const application = applications.get(event.applicationId); return application ? [{ ...event, company: application.company, role: application.role }] : []; }); }
