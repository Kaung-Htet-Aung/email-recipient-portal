import { api } from "@/lib/api-client";
import type {
  EmailList,
  EmailListRecipient,
  RecipientType,
} from "@/types";

export interface EmailListPayload {
  applicationId: string;
  code: string;
  name: string;
  description?: string;
}

export interface AddRecipientPayload {
  recipientId: string;
  recipientType?: RecipientType;
  role?: string;
  priority?: number;
  beforeRecipientId?: string;
  afterRecipientId?: string;
}

export const emailListsService = {
  list: (applicationId?: string) =>
    api.get<EmailList[]>(
      `/email-lists${applicationId ? `?applicationId=${applicationId}` : ""}`,
    ),
  get: (id: string) => api.get<EmailList>(`/email-lists/${id}`),
  create: (payload: EmailListPayload) =>
    api.post<EmailList>("/email-lists", payload),
  update: (id: string, payload: Partial<EmailListPayload>) =>
    api.put<EmailList>(`/email-lists/${id}`, payload),
  toggleStatus: (id: string) =>
    api.patch<EmailList>(`/email-lists/${id}/toggle-status`),
  addRecipient: (id: string, payload: AddRecipientPayload) =>
    api.post<EmailListRecipient>(`/email-lists/${id}/recipients`, payload),
  removeRecipient: (id: string, recipientId: string) =>
    api.delete<void>(`/email-lists/${id}/recipients/${recipientId}`),
  updateRecipientType: (
    id: string,
    recipientId: string,
    payload: {
      recipientType?: RecipientType;
      role?: string;
      priority?: number;
      beforeRecipientId?: string;
      afterRecipientId?: string;
    },
  ) =>
    api.patch<EmailListRecipient>(
      `/email-lists/${id}/recipients/${recipientId}`,
      payload,
    ),
  remove: (id: string) => api.delete<EmailList>(`/email-lists/${id}`),
};
