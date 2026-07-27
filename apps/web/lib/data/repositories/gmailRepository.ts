import type { GmailRepository } from "@/lib/data/types/repositories";
import type { GmailConnectionStatus, GmailSuggestion } from "@/lib/types";
import { applicationEventRepository } from "@/lib/data/repositories/applicationEventRepository";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";

const KEY = "offeros:gmail-simulation:v1";
type State = { connection: GmailConnectionStatus; suggestions: GmailSuggestion[] };

export const gmailRepository: GmailRepository = {
  async status() { return read().connection; },
  async connect() {
    const state = read();
    state.connection = { enabled: true, connected: true, gmailAddress: "demo.recruiting@example.com", status: "connected", scope: "Simulated local data - no Gmail access", simulated: true };
    if (!state.suggestions.length) state.suggestions = await samples();
    write(state);
    return { status: state.connection };
  },
  async sync() {
    const state = read();
    if (!state.connection.connected) throw new Error("Connect the simulated Gmail workspace first.");
    if (!state.suggestions.length) state.suggestions = await samples();
    const now = new Date().toISOString();
    state.connection.lastSyncedAt = now;
    write(state);
    return { status: "completed", messagesScanned: 3, candidatesFound: state.suggestions.length, suggestionsCreated: state.suggestions.length, duplicatesSkipped: 0, lastSyncedAt: now };
  },
  async suggestions(status, applicationId) {
    return read().suggestions.filter((item) => (!status || item.status === status) && (!applicationId || item.applicationId === applicationId));
  },
  async accept(id, input) {
    const state = read();
    const current = state.suggestions.find((item) => item.id === id);
    if (!current) throw new Error("Gmail suggestion not found.");
    if (current.status === "accepted") return current;
    const event = await applicationEventRepository.create(input.applicationId, { eventType: input.eventType, title: `Gmail: ${current.emailType.replaceAll("_", " ")}`, description: input.note || "Confirmed simulated Gmail suggestion.", scheduledAt: input.eventAt, status: "upcoming", source: "future_email" });
    if (input.applyStatus && input.proposedStatus) await applicationRepository.update(input.applicationId, { status: input.proposedStatus, recruiterName: input.recruiterName ?? "" });
    const updated = { ...current, applicationId: input.applicationId, acceptedEventId: event.id, status: "accepted" as const, reviewedAt: new Date().toISOString(), note: input.note };
    state.suggestions = state.suggestions.map((item) => item.id === id ? updated : item);
    write(state);
    return updated;
  },
  async reject(id) {
    const state = read();
    const current = state.suggestions.find((item) => item.id === id);
    if (!current) throw new Error("Gmail suggestion not found.");
    const updated = { ...current, status: "rejected" as const, reviewedAt: new Date().toISOString() };
    state.suggestions = state.suggestions.map((item) => item.id === id ? updated : item);
    write(state);
    return updated;
  },
  async disconnect(deleteDerivedData) {
    const state = read();
    state.connection = { enabled: true, connected: false, status: "disconnected", scope: "Simulated local data - no Gmail access", simulated: true };
    if (deleteDerivedData) state.suggestions = retainedAccepted(state.suggestions);
    write(state);
  },
  async deleteDerivedData() {
    const state = read();
    state.suggestions = retainedAccepted(state.suggestions);
    write(state);
  },
};

function read(): State {
  if (typeof window === "undefined") return empty();
  try { return JSON.parse(localStorage.getItem(KEY) || "") as State; } catch { return empty(); }
}
function write(value: State) { localStorage.setItem(KEY, JSON.stringify(value)); }
function empty(): State { return { connection: { enabled: true, connected: false, status: "disconnected", scope: "Simulated local data - no Gmail access", simulated: true }, suggestions: [] }; }
async function samples(): Promise<GmailSuggestion[]> {
  const applications = await applicationRepository.list();
  const app = applications[0];
  const now = new Date();
  return app ? [{
    id: "gmail-sample-interview", applicationId: app.id, suggestionType: "add_timeline_event", emailType: "interview_invitation",
    suggestedStatus: "Interview", suggestedEventType: "technical_interview", suggestedEventAt: new Date(now.getTime() + 2 * 86_400_000).toISOString(),
    dateIsAmbiguous: false, companyName: app.company, roleTitle: app.role, recruiterName: "Sample Recruiter", confidence: 0.91,
    evidence: ["Company matches an existing application", "Subject references technical interview"], status: "pending", note: "",
    message: { senderEmail: "recruiting@example.com", senderName: "Sample Recruiter", subject: `Technical interview - ${app.company}`, snippet: "Please review the proposed interview time.", excerpt: "This is simulated local data. No Gmail account is connected.", receivedAt: now.toISOString() },
    createdAt: now.toISOString(),
  }] : [];
}
function retainedAccepted(suggestions: GmailSuggestion[]) {
  return suggestions.filter((item) => item.status === "accepted").map((item) => ({
    ...item,
    message: {
      ...item.message,
      senderEmail: "",
      senderName: undefined,
      subject: "Confirmed recruiting email",
      snippet: undefined,
      excerpt: undefined,
    },
  }));
}
