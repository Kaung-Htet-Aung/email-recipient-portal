import { api } from "@/lib/api-client";
import type { Department } from "@/types";

export interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
}

export const departmentsService = {
  list: () => api.get<Department[]>("/departments"),
  get: (id: string) => api.get<Department>(`/departments/${id}`),
  create: (payload: DepartmentPayload) =>
    api.post<Department>("/departments", payload),
  update: (id: string, payload: Partial<DepartmentPayload>) =>
    api.put<Department>(`/departments/${id}`, payload),
  toggleStatus: (id: string) =>
    api.patch<Department>(`/departments/${id}/toggle-status`),
  remove: (id: string) => api.delete<Department>(`/departments/${id}`),
};
