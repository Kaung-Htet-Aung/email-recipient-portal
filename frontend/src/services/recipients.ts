import { api } from "@/lib/api-client";
import type { EmailRecipient, RecipientsResponse } from "@/types";

export interface RecipientPayload {
  employeeCode: string;
  name: string;
  email: string;
  departmentId?: string;
}

export interface RecipientQuery {
  search?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

function toQueryString(query: RecipientQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const recipientsService = {
  list: (query: RecipientQuery = {}) =>
    api.get<RecipientsResponse>(`/recipients${toQueryString(query)}`),
  get: (id: string) => api.get<EmailRecipient>(`/recipients/${id}`),
  create: (payload: RecipientPayload) =>
    api.post<EmailRecipient>("/recipients", payload),
  update: (id: string, payload: Partial<RecipientPayload>) =>
    api.put<EmailRecipient>(`/recipients/${id}`, payload),
  toggleStatus: (id: string) =>
    api.patch<EmailRecipient>(`/recipients/${id}/toggle-status`),
  remove: (id: string) => api.delete<EmailRecipient>(`/recipients/${id}`),
};
