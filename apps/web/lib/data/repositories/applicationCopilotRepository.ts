import type { ApplicationCopilotRepository } from "@/lib/data/types/repositories";
import {
  clearApplicationCopilot,
  readApplicationCopilot,
  writeApplicationCopilot,
} from "@/lib/data/storage/local/applicationCopilotStorage";

export const applicationCopilotRepository: ApplicationCopilotRepository = {
  async history(applicationId) {
    return readApplicationCopilot(applicationId);
  },
  async send(applicationId, input) {
    const current = readApplicationCopilot(applicationId);
    const conversationId = input.conversationId ?? current.conversationId ?? createId();
    const now = new Date().toISOString();
    const userMessage = {
      id: createId(),
      role: "user" as const,
      content: input.message.trim(),
      createdAt: now,
    };
    const assistantMessage = {
      id: createId(),
      role: "assistant" as const,
      content: localResponse(input.message),
      createdAt: new Date().toISOString(),
    };
    writeApplicationCopilot(applicationId, {
      ...current,
      conversationId,
      contextSources: current.contextSources.length
        ? current.contextSources
        : ["Application details", "Local workspace"],
      messages: [...current.messages, userMessage, assistantMessage],
    });
    return { conversationId, message: assistantMessage };
  },
  async clear(applicationId) {
    clearApplicationCopilot(applicationId);
  },
};

function localResponse(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("follow-up") || normalized.includes("follow up")) {
    return "Subject: Following up on the role\n\nHi there,\n\nThank you again for your time. I remain interested in the opportunity and would appreciate any update you can share on next steps. Please let me know if I can provide anything else.\n\nBest,\nCandidate";
  }
  return "Local mode provides simulated recruiting guidance. Focus on the explicit requirements in the saved role, prepare evidence from your actual experience, and prioritize the largest verified skill gap. Connect cloud API mode for application-grounded AI responses.";
}

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `copilot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
