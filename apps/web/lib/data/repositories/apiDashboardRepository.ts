import type { DashboardRepository } from "@/lib/data/types/repositories";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";
import type { ApiDataResponse, ApiWorkspaceSummary } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiWorkspaceSummary } from "@/lib/data/api/workspaceSummary";
import { fromApiEvent } from "@/lib/data/repositories/apiApplicationEventRepository";

export const apiDashboardRepository: DashboardRepository = {
  async summary() {
    const response = await apiClient.get<ApiDataResponse<ApiWorkspaceSummary>>("/dashboard/summary");
    const { applications, resumes, prep } = fromApiWorkspaceSummary(response.data);
    const upcomingEvents = (response.data.upcoming_events ?? []).map((item) => ({ ...fromApiEvent(item), company: item.company, role: item.role }));
    const focus = response.data.focus ? { type: response.data.focus.type, applicationId: response.data.focus.application_id, title: response.data.focus.title, subtitle: response.data.focus.subtitle, dueAt: response.data.focus.due_at ?? "", priority: response.data.focus.priority, prepReadiness: response.data.focus.prep_readiness ?? undefined, prepNextAction: response.data.focus.prep_next_action ?? undefined } : null;
    return buildDashboardSummary(applications, resumes, prep, upcomingEvents, focus);
  },
};
