import { apiClient } from "@/lib/data/api/apiClient";
import type { ApiDataResponse } from "@/lib/data/api/contracts";
import type { WorkspaceResetMode, WorkspaceResetResult, WorkspaceScope } from "@/lib/data/types/repositories";

type WorkspaceResetPayload = {
  scope: WorkspaceScope;
  mode: WorkspaceResetMode;
};

export async function resetApiWorkspace(scope: WorkspaceScope, mode: WorkspaceResetMode) {
  if (process.env.NODE_ENV === "development") {
    console.debug("[OfferOS reset]", { scope, mode });
  }
  const response = await apiClient.post<ApiDataResponse<WorkspaceResetResult>, WorkspaceResetPayload>(
    "/workspace/reset",
    { scope, mode },
  );
  if (process.env.NODE_ENV === "development") {
    console.debug("[OfferOS reset complete]", response.data);
  }
  return response.data;
}
