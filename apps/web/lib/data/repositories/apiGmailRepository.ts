import { apiClient } from "@/lib/data/api/apiClient";
import type { GmailRepository } from "@/lib/data/types/repositories";
import type { ApplicationEventType, GmailConnectionStatus, GmailSuggestion } from "@/lib/types";

type Data<T> = { data: T };
type ApiStatus = { enabled: boolean; connected: boolean; gmail_address?: string | null; status: GmailConnectionStatus["status"]; scope: string; last_synced_at?: string | null; initial_sync_completed_at?: string | null; error_message?: string | null };
type ApiSuggestion = {
  id: string; application_id?: string | null; accepted_event_id?: string | null; suggestion_type: string; email_type: string;
  suggested_status?: string | null; suggested_event_type?: string | null; suggested_event_at?: string | null; suggested_deadline_at?: string | null;
  source_timezone?: string | null; date_is_ambiguous: boolean; company_name?: string | null; role_title?: string | null;
  recruiter_name?: string | null; confidence: number; evidence: string[]; status: GmailSuggestion["status"]; reviewed_at?: string | null;
  note: string; created_at: string; message: { sender_email: string; sender_name?: string | null; subject: string; snippet?: string | null; excerpt?: string | null; received_at: string };
};

export const apiGmailRepository: GmailRepository = {
  async status() {
    return fromStatus((await apiClient.get<Data<ApiStatus>>("/integrations/gmail/status")).data);
  },
  async connect() {
    const response = await apiClient.get<Data<{ authorization_url: string }>>("/integrations/gmail/connect");
    return { authorizationUrl: response.data.authorization_url };
  },
  async sync() {
    const value = (await apiClient.post<Data<{ status: string; messages_scanned: number; candidates_found: number; suggestions_created: number; duplicates_skipped: number; last_synced_at?: string | null }>>("/integrations/gmail/sync", {})).data;
    return { status: value.status, messagesScanned: value.messages_scanned, candidatesFound: value.candidates_found, suggestionsCreated: value.suggestions_created, duplicatesSkipped: value.duplicates_skipped, lastSyncedAt: value.last_synced_at ?? undefined };
  },
  async suggestions(status, applicationId) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (applicationId) params.set("application_id", applicationId);
    const suffix = params.size ? `?${params}` : "";
    return (await apiClient.get<Data<ApiSuggestion[]>>(`/integrations/gmail/suggestions${suffix}`)).data.map(fromSuggestion);
  },
  async accept(id, input) {
    const response = await apiClient.post<Data<ApiSuggestion>>(`/integrations/gmail/suggestions/${id}/accept`, {
      application_id: input.applicationId, event_type: input.eventType, event_at: input.eventAt,
      deadline_at: input.deadlineAt || null, proposed_status: input.proposedStatus || null,
      apply_status: input.applyStatus, recruiter_name: input.recruiterName || null, note: input.note,
    });
    return fromSuggestion(response.data);
  },
  async reject(id) {
    return fromSuggestion((await apiClient.post<Data<ApiSuggestion>>(`/integrations/gmail/suggestions/${id}/reject`, {})).data);
  },
  async disconnect(deleteDerivedData) {
    await apiClient.post("/integrations/gmail/disconnect", { delete_derived_data: deleteDerivedData });
  },
  async deleteDerivedData() {
    await apiClient.post("/integrations/gmail/delete-data", { confirmation: "DELETE GMAIL DATA" });
  },
};

function fromStatus(value: ApiStatus): GmailConnectionStatus {
  return { enabled: value.enabled, connected: value.connected, gmailAddress: value.gmail_address ?? undefined, status: value.status, scope: value.scope, lastSyncedAt: value.last_synced_at ?? undefined, initialSyncCompletedAt: value.initial_sync_completed_at ?? undefined, errorMessage: value.error_message ?? undefined };
}
function fromSuggestion(value: ApiSuggestion): GmailSuggestion {
  return {
    id: value.id, applicationId: value.application_id ?? undefined, acceptedEventId: value.accepted_event_id ?? undefined,
    suggestionType: value.suggestion_type, emailType: value.email_type, suggestedStatus: value.suggested_status ?? undefined,
    suggestedEventType: value.suggested_event_type as ApplicationEventType | undefined, suggestedEventAt: value.suggested_event_at ?? undefined,
    suggestedDeadlineAt: value.suggested_deadline_at ?? undefined, sourceTimezone: value.source_timezone ?? undefined,
    dateIsAmbiguous: value.date_is_ambiguous, companyName: value.company_name ?? undefined, roleTitle: value.role_title ?? undefined,
    recruiterName: value.recruiter_name ?? undefined, confidence: value.confidence, evidence: value.evidence,
    status: value.status, reviewedAt: value.reviewed_at ?? undefined, note: value.note, createdAt: value.created_at,
    message: { senderEmail: value.message.sender_email, senderName: value.message.sender_name ?? undefined, subject: value.message.subject, snippet: value.message.snippet ?? undefined, excerpt: value.message.excerpt ?? undefined, receivedAt: value.message.received_at },
  };
}
