"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/data/api/apiClient";
import type { ApiDataResponse } from "@/lib/data/api/contracts";
import { dataMode } from "@/lib/data/repositories/repositoryFactory";
import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ApiSettings = {
  theme: ThemePreference;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => (
    typeof window === "undefined" ? "dark" : readStoredTheme()
  ));
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => (
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  ));

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    if (dataMode !== "api") return;
    let cancelled = false;
    apiClient.get<ApiDataResponse<ApiSettings>>("/settings")
      .then((response) => {
        if (cancelled) return;
        const nextTheme = normalizeTheme(response.data.theme);
        setThemeState(nextTheme);
        writeStoredTheme(nextTheme);
      })
      .catch(() => {
        // Keep the local preference if cloud settings are temporarily unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(async (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    writeStoredTheme(nextTheme);
    applyTheme(nextTheme === "system" ? systemTheme : nextTheme);
    if (dataMode === "api") {
      try {
        await apiClient.patch<ApiDataResponse<ApiSettings>, { theme: ThemePreference }>("/settings", { theme: nextTheme });
      } catch {
        // Local preference remains applied; cloud settings will be retried on the next explicit change.
      }
    }
  }, [systemTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider.");
  return value;
}

function readStoredTheme(): ThemePreference {
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function writeStoredTheme(theme: ThemePreference) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "system" || value === "dark" ? value : "dark";
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);
}
