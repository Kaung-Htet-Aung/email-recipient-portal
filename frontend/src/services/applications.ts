import { api } from "@/lib/api-client";
import type { Application } from "@/types";

export interface ApplicationPayload {
  code: string;
  name: string;
  description?: string;
}

export const applicationsService = {
  list: () => api.get<Application[]>("/applications"),
  get: (id: string) => api.get<Application>(`/applications/${id}`),
  create: (payload: ApplicationPayload) =>
    api.post<Application>("/applications", payload),
  update: (id: string, payload: Partial<ApplicationPayload>) =>
    api.put<Application>(`/applications/${id}`, payload),
  toggleStatus: (id: string) =>
    api.patch<Application>(`/applications/${id}/toggle-status`),
};
