import type { ApplicationCopilotConversation } from "@/lib/types";

const STORAGE_KEY = "offeros.application-copilot.v1";

type StoredConversations = Record<string, ApplicationCopilotConversation>;

export function readApplicationCopilot(applicationId: string): ApplicationCopilotConversation {
  if (typeof window === "undefined") return emptyConversation();
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredConversations;
    return stored[applicationId] ?? emptyConversation();
  } catch {
    return emptyConversation();
  }
}

export function writeApplicationCopilot(
  applicationId: string,
  conversation: ApplicationCopilotConversation,
) {
  if (typeof window === "undefined") return;
  let stored: StoredConversations = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredConversations;
  } catch {
    stored = {};
  }
  stored[applicationId] = conversation;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearApplicationCopilot(applicationId: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredConversations;
    delete stored[applicationId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearAllApplicationCopilot() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

function emptyConversation(): ApplicationCopilotConversation {
  return { messages: [], contextSources: [], hasMore: false };
}
