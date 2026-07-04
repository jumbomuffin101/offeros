const ONBOARDING_KEY = "offeros:onboarding-complete";
const RECENT_COMMANDS_KEY = "offeros:recent-commands";
const INSTALL_DISMISSED_KEY = "offeros:install-dismissed";

export function isOnboardingComplete() { return storage().getItem(ONBOARDING_KEY) === "true"; }
export function completeOnboarding() { storage().setItem(ONBOARDING_KEY, "true"); }
export function readRecentCommands() {
  try {
    const value: unknown = JSON.parse(storage().getItem(RECENT_COMMANDS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}
export function writeRecentCommands(labels: string[]) { storage().setItem(RECENT_COMMANDS_KEY, JSON.stringify(labels)); }
export function isInstallDismissed() { return storage().getItem(INSTALL_DISMISSED_KEY) === "true"; }
export function dismissInstall() { storage().setItem(INSTALL_DISMISSED_KEY, "true"); }
export function clearInstallDismissal() { storage().removeItem(INSTALL_DISMISSED_KEY); }
export function removePreference(key: string) { storage().removeItem(key); }
export function clearOfferOSStorage() {
  for (const key of Object.keys(storage())) if (key.startsWith("offeros:")) storage().removeItem(key);
}

function storage() {
  if (typeof window === "undefined") throw new Error("Local storage is only available in the browser.");
  return window.localStorage;
}
