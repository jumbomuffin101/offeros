export const workspaceActions = {
  application: { event: "offeros:add-application", storageKey: "offeros:open-add-application", href: "/applications" },
  resume: { event: "offeros:upload-resume", storageKey: "offeros:open-upload-resume", href: "/resumes" },
  coding: { event: "offeros:add-coding-problem", storageKey: "offeros:open-add-coding-problem", href: "/prep" },
  systemDesign: { event: "offeros:add-system-design", storageKey: "offeros:open-add-system-design", href: "/prep" },
} as const;

export type WorkspaceAction = keyof typeof workspaceActions;

export function requestWorkspaceAction(action: WorkspaceAction) {
  const config = workspaceActions[action];
  window.sessionStorage.setItem(config.storageKey, "true");
  window.dispatchEvent(new Event(config.event));
  return config.href;
}

export const ESCAPE_EVENT = "offeros:escape";
