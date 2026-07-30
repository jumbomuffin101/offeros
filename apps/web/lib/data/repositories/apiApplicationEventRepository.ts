import type { ApiApplicationEvent, ApiDataResponse, ApiUpcomingEvent } from "@/lib/data/api/contracts";
import type { ApplicationEventRepository } from "@/lib/data/types/repositories";
import type { ApplicationEvent, ApplicationEventType } from "@/lib/types";
import { apiClient } from "@/lib/data/api/apiClient";

export const apiApplicationEventRepository: ApplicationEventRepository = {
  async list(applicationId) { const response = await apiClient.get<ApiDataResponse<ApiApplicationEvent[]>>(`/applications/${applicationId}/events`); return response.data.map(fromApiEvent); },
  async create(applicationId, input) { const response = await apiClient.post<ApiDataResponse<ApiApplicationEvent>>(`/applications/${applicationId}/events`, toApiEvent(input)); return fromApiEvent(response.data); },
  async update(id, input) { const response = await apiClient.patch<ApiDataResponse<ApiApplicationEvent>>(`/application-events/${id}`, toApiEvent(input)); return fromApiEvent(response.data); },
  async delete(id) { await apiClient.delete(`/application-events/${id}`); },
  async addToCalendar(id) { const response = await apiClient.post<ApiDataResponse<ApiApplicationEvent>>(`/application-events/${id}/calendar`, {}); return fromApiEvent(response.data); },
  async upcoming() { const response = await apiClient.get<ApiDataResponse<ApiUpcomingEvent[]>>("/dashboard/upcoming-events"); return response.data.map((item) => ({ ...fromApiEvent(item), company: item.company, role: item.role })); },
};
export function fromApiEvent(value: ApiApplicationEvent): ApplicationEvent { return { id: value.id, applicationId: value.application_id, eventType: value.event_type as ApplicationEventType, title: value.title, description: value.description, scheduledAt: value.scheduled_at, completedAt: value.completed_at ?? "", status: value.status, source: value.source, externalCalendarEventId: value.external_calendar_event_id ?? "", createdAt: value.created_at, updatedAt: value.updated_at }; }
function toApiEvent(value: Partial<ApplicationEvent>) { return { event_type: value.eventType, title: value.title, description: value.description, scheduled_at: value.scheduledAt, status: value.status, source: value.source }; }
