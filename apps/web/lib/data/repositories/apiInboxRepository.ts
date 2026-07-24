import type { ApplicationInbox, ApplicationAttentionItem } from "@/lib/types";
import type { InboxRepository } from "@/lib/data/types/repositories";
import { apiClient } from "@/lib/data/api/apiClient";
import type { ApiAttentionItem } from "@/lib/data/api/contracts";

type ApiInbox = {
  items: ApiAttentionItem[];
  summary: ApplicationInbox["summary"];
};

export const apiInboxRepository: InboxRepository = {
  async list() {
    return fromApiInbox(await apiClient.get<ApiInbox>("/inbox"));
  },
  async override(input) {
    return fromApiInbox(await apiClient.post<ApiInbox>("/inbox/overrides", {
      application_id: input.applicationId,
      category: input.category,
      action: input.action,
      duration: input.duration ?? null,
    }));
  },
};

export function fromApiAttentionItem(item: ApiAttentionItem): ApplicationAttentionItem {
  return {
    id: item.id,
    applicationId: item.application_id,
    company: item.company,
    role: item.role,
    category: item.category,
    priority: item.priority,
    title: item.title,
    description: item.description,
    dueAt: item.due_at ?? "",
    createdAt: item.created_at,
    suggestedAction: item.suggested_action,
    lastMeaningfulActivity: item.last_meaningful_activity ?? "",
    daysSinceUpdate: item.days_since_update,
    followUpCount: item.follow_up_count,
    daysToFirstResponse: item.days_to_first_response ?? undefined,
    daysFromInterviewToOutcome:
      item.days_from_interview_to_outcome ?? undefined,
  };
}

function fromApiInbox(value: ApiInbox): ApplicationInbox {
  return { items: value.items.map(fromApiAttentionItem), summary: value.summary };
}
