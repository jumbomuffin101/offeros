import type { AnalyticsRepository, ApplicationRepository, DashboardRepository, PrepRepository, ResumeRepository, WorkspaceRepository } from "@/lib/data/types/repositories";
import { applicationRepository as localApplicationRepository } from "@/lib/data/repositories/applicationRepository";
import { resumeRepository as localResumeRepository } from "@/lib/data/repositories/resumeRepository";
import { prepRepository as localPrepRepository } from "@/lib/data/repositories/prepRepository";
import { dashboardRepository as localDashboardRepository } from "@/lib/data/repositories/dashboardRepository";
import { analyticsRepository as localAnalyticsRepository } from "@/lib/data/repositories/analyticsRepository";
import { apiApplicationRepository } from "@/lib/data/repositories/apiApplicationRepository";
import { apiResumeRepository } from "@/lib/data/repositories/apiResumeRepository";
import { apiPrepRepository } from "@/lib/data/repositories/apiPrepRepository";
import { apiDashboardRepository } from "@/lib/data/repositories/apiDashboardRepository";
import { apiAnalyticsRepository } from "@/lib/data/repositories/apiAnalyticsRepository";
import { workspaceRepository as localWorkspaceRepository } from "@/lib/data/repositories/workspaceRepository";
import { apiWorkspaceRepository } from "@/lib/data/repositories/apiWorkspaceRepository";

export type DataMode = "local" | "api";
export const dataMode: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "local";

export const applicationRepository: ApplicationRepository = dataMode === "api" ? apiApplicationRepository : localApplicationRepository;
export const resumeRepository: ResumeRepository = dataMode === "api" ? apiResumeRepository : localResumeRepository;
export const prepRepository: PrepRepository = dataMode === "api" ? apiPrepRepository : localPrepRepository;
export const dashboardRepository: DashboardRepository = dataMode === "api" ? apiDashboardRepository : localDashboardRepository;
export const analyticsRepository: AnalyticsRepository = dataMode === "api" ? apiAnalyticsRepository : localAnalyticsRepository;
export const workspaceRepository: WorkspaceRepository = dataMode === "api" ? apiWorkspaceRepository : localWorkspaceRepository;
