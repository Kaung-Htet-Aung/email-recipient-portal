import { api } from "@/lib/api-client";
import type { ApplicationCredential, DashboardStats } from "@/types";

export const dashboardService = {
  getStats: () => api.get<DashboardStats>("/dashboard"),
};

export const credentialsService = {
  list: (applicationId?: string) =>
    api.get<ApplicationCredential[]>(
      `/credentials${applicationId ? `?applicationId=${applicationId}` : ""}`,
    ),
  generate: (applicationId: string, payload: { name: string; description?: string }) =>
    api.post<ApplicationCredential>(
      `/credentials/applications/${applicationId}`,
      payload,
    ),
  revoke: (id: string) =>
    api.patch<ApplicationCredential>(`/credentials/${id}/revoke`),
  regenerate: (id: string) =>
    api.patch<ApplicationCredential>(`/credentials/${id}/regenerate`),
};
