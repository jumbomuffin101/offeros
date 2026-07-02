"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const INSTALL_DISMISSED_KEY = "offeros:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface PwaContextValue {
  canInstall: boolean;
  installDismissed: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  dismissInstall: () => void;
  install: () => Promise<boolean>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const installedOnIos = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    queueMicrotask(() => {
      setIsOnline(navigator.onLine);
      setIsInstalled(standalone || installedOnIos);
      setInstallDismissed(window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true");
    });

    function handleInstallAvailable(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallEvent(null);
      setIsInstalled(true);
      window.localStorage.removeItem(INSTALL_DISMISSED_KEY);
    }

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const dismissInstall = useCallback(() => {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setInstallDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
    return choice.outcome === "accepted";
  }, [installEvent]);

  const value = useMemo(
    () => ({
      canInstall: Boolean(installEvent) && !isInstalled,
      dismissInstall,
      install,
      installDismissed,
      isInstalled,
      isOnline,
    }),
    [dismissInstall, install, installDismissed, installEvent, isInstalled, isOnline],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("usePwa must be used within PwaProvider");
  return context;
}
