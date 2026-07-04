export const OFFEROS_DATA_CHANGED_EVENT = "offeros:data-changed";

export function announceDataChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OFFEROS_DATA_CHANGED_EVENT));
}
