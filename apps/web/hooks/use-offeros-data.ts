"use client";

import { useEffect, useState } from "react";
import type { Application, PrepWorkspaceData, ResumeVersion } from "@/lib/types";
import { applications, prepWorkspaceData, resumes } from "@/lib/mock-data";
import { loadStoredApplications } from "@/lib/application-storage";
import { loadStoredResumes } from "@/lib/resume-storage";
import { loadStoredPrep } from "@/lib/prep-storage";

export type OfferOSData = {
  applications: Application[];
  resumes: ResumeVersion[];
  prep: PrepWorkspaceData;
  asOf: string;
  hydrated: boolean;
};

const fallbackAsOf = "2026-06-30T12:00:00.000Z";

export function useOfferOSData(): OfferOSData {
  const [data, setData] = useState<OfferOSData>({
    applications,
    resumes,
    prep: prepWorkspaceData,
    asOf: fallbackAsOf,
    hydrated: false,
  });

  useEffect(() => {
    function refresh() {
      setData({
        applications: loadStoredApplications(applications),
        resumes: loadStoredResumes(resumes),
        prep: loadStoredPrep(prepWorkspaceData),
        asOf: new Date().toISOString(),
        hydrated: true,
      });
    }

    window.queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return data;
}
