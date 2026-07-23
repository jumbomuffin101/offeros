import type { ApplicationCopilotRepository } from "@/lib/data/types/repositories";
import { apiClient } from "@/lib/data/api/apiClient";

type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
type ApiHistory = {
  data: {
    conversation_id: string | null;
    messages: ApiMessage[];
    context_sources: string[];
    has_more: boolean;
  };
};
type ApiSend = {
  conversation_id: string;
  message: ApiMessage;
};

export const apiApplicationCopilotRepository: ApplicationCopilotRepository = {
  async history(applicationId) {
    const response = await apiClient.get<ApiHistory>(`/applications/${applicationId}/copilot`);
    return {
      conversationId: response.data.conversation_id ?? undefined,
      messages: response.data.messages.map(fromApiMessage),
      contextSources: response.data.context_sources,
      hasMore: response.data.has_more,
    };
  },
  async send(applicationId, input) {
    const response = await apiClient.post<ApiSend>(
      `/applications/${applicationId}/copilot`,
      {
        message: input.message,
        conversation_id: input.conversationId ?? null,
      },
      {
        timeoutMs: 300_000,
        timeoutMessage: "Recruiter Copilot is taking longer than expected. Please try again.",
      },
    );
    if (!response?.conversation_id || !response.message?.id) {
      throw new Error("OfferOS received an unexpected Copilot response.");
    }
    return {
      conversationId: response.conversation_id,
      message: fromApiMessage(response.message),
    };
  },
  async clear(applicationId, conversationId) {
    await apiClient.delete(`/applications/${applicationId}/copilot/${conversationId}`);
  },
};

function fromApiMessage(message: ApiMessage) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
  };
}
