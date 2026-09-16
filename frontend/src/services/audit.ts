import { api } from "@/lib/api-client";
import type { AuditLog, AuditLogsResponse } from "@/types";

export interface AuditQuery {
  search?: string;
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
}

function toQueryString(query: AuditQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const auditService = {
  list: (query: AuditQuery = {}) =>
    api.get<AuditLogsResponse>(`/audit-logs${toQueryString(query)}`),
  get: (id: string) => api.get<AuditLog>(`/audit-logs/${id}`),
};
