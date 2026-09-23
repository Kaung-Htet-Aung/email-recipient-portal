export type Status = "ACTIVE" | "INACTIVE";
export type RecipientType = "TO" | "CC" | "BCC";
export type AdminRole = "ADMIN" | "VIEWER";

export interface Application {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  _count?: {
    emailLists: number;
    credentials: number;
  };
  emailLists?: EmailList[];
  credentials?: ApplicationCredential[];
}

export interface ApplicationCredential {
  id: string;
  applicationId: string;
  application?: Application;
  apiKey?: string;
  name: string;
  description?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  _count?: {
    recipients: number;
  };
  recipients?: EmailRecipient[];
}

export interface EmailRecipient {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  departmentId?: string | null;
  department?: Department | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface EmailListRecipient {
  id: string;
  emailListId: string;
  recipientId: string;
  recipient: EmailRecipient;
  recipientType: RecipientType;
  role?: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailList {
  id: string;
  applicationId: string;
  application?: Application;
  code: string;
  name: string;
  description?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  recipients?: EmailListRecipient[];
  _count?: {
    recipients: number;
  };
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: {
    name: string;
    email: string;
  } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export interface DashboardStats {
  counts: {
    applications: number;
    emailLists: number;
    recipients: number;
    departments: number;
    activeLists: number;
    inactiveLists: number;
    activeRecipients: number;
    inactiveRecipients: number;
  };
  recentAuditLogs: AuditLog[];
  recentLists: EmailList[];
  recentRecipients: EmailRecipient[];
}

export interface Paginated {
  total: number;
  page: number;
  limit: number;
}

export interface RecipientsResponse extends Paginated {
  recipients: EmailRecipient[];
}

export interface AuditLogsResponse extends Paginated {
  logs: AuditLog[];
}

export interface ResolvedList {
  application: string;
  list: string;
  recipients: {
    name: string;
    email: string;
    type: RecipientType;
    role?: string | null;
    priority: number;
  }[];
}
