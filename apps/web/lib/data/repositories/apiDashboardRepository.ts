import type { DashboardRepository } from "@/lib/data/types/repositories";
import { buildDashboardSummary } from "@/lib/data/repositories/summaryBuilders";
import type { ApiDataResponse, ApiWorkspaceSummary } from "@/lib/data/api/contracts";
import { apiClient } from "@/lib/data/api/apiClient";
import { fromApiWorkspaceSummary } from "@/lib/data/api/workspaceSummary";
import { fromApiEvent } from "@/lib/data/repositories/apiApplicationEventRepository";
import { fromApiAttentionItem } from "@/lib/data/repositories/apiInboxRepository";

export const apiDashboardRepository: DashboardRepository = {
  async summary() {
    const response = await apiClient.get<ApiDataResponse<ApiWorkspaceSummary>>("/dashboard/summary");
    const { applications, resumes, prep } = fromApiWorkspaceSummary(response.data);
    const upcomingEvents = (response.data.upcoming_events ?? []).map((item) => ({ ...fromApiEvent(item), company: item.company, role: item.role }));
    const attentionItems = (response.data.attention_items ?? []).map(fromApiAttentionItem);
    return buildDashboardSummary(applications, resumes, prep, upcomingEvents, attentionItems);
  },
};
