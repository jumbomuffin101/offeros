export type ThemePreference = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "offeros:theme";
export const DARK_THEME_COLOR = "#151722";
export const LIGHT_THEME_COLOR = "#f6f7fb";

export function themeBootScript() {
  return `
(() => {
  try {
    const stored = localStorage.getItem("${THEME_STORAGE_KEY}") || "dark";
    const theme = ["dark", "light", "system"].includes(stored) ? stored : "dark";
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "${LIGHT_THEME_COLOR}" : "${DARK_THEME_COLOR}");
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;
}
