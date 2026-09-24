export type Status = 'ACTIVE' | 'INACTIVE'
export type RecipientType = 'TO' | 'CC' | 'BCC'
export type AdminRole = 'ADMIN' | 'VIEWER'

export interface CloudflareBindings {
  DB: D1Database
  JWT_SECRET: string
  JWT_EXPIRES_IN?: string
  FRONTEND_URL?: string
  ADMIN_EMAIL?: string
  ADMIN_DEFAULT_PASSWORD?: string
}

export interface AppVariables {
  admin?: AdminRow
  application?: ApplicationRow
}

export type AppEnv = { Bindings: CloudflareBindings; Variables: AppVariables }

// DB rows (snake_case) -------------------------------------------------------

export interface AdminRow {
  id: string
  email: string
  name: string
  password: string
  role: AdminRole
  status: Status
  created_at: string
  updated_at: string
}

export interface ApplicationRow {
  id: string
  code: string
  name: string
  description: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface DepartmentRow {
  id: string
  code: string
  name: string
  description: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface RecipientRow {
  id: string
  employee_code: string
  name: string
  email: string
  department_id: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface EmailListRow {
  id: string
  application_id: string
  code: string
  name: string
  description: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface MembershipRow {
  id: string
  email_list_id: string
  recipient_id: string
  recipient_type: RecipientType
  role: string | null
  priority: number
  created_at: string
  updated_at: string
}

export interface CredentialRow {
  id: string
  application_id: string
  api_key: string
  name: string
  description: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface AuditRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
}

// API-facing shapes (camelCase, Prisma-compatible) ---------------------------

export interface AdminUserDto {
  id: string
  email: string
  name: string
  role: AdminRole
}

export interface ApplicationDto {
  id: string
  code: string
  name: string
  description: string | null
  status: Status
  createdAt: string
  updatedAt: string
  _count?: { emailLists: number; credentials: number }
  emailLists?: EmailListDto[]
  credentials?: CredentialDto[]
}

export interface DepartmentDto {
  id: string
  code: string
  name: string
  description: string | null
  status: Status
  createdAt: string
  updatedAt: string
  _count?: { recipients: number }
  recipients?: RecipientDto[]
}

export interface RecipientDto {
  id: string
  employeeCode: string
  name: string
  email: string
  departmentId: string | null
  department?: DepartmentDto | null
  status: Status
  createdAt: string
  updatedAt: string
}

export interface EmailListDto {
  id: string
  applicationId: string
  application?: ApplicationDto
  code: string
  name: string
  description: string | null
  status: Status
  createdAt: string
  updatedAt: string
  _count?: { recipients: number }
  recipients?: MembershipDto[]
}

export interface MembershipDto {
  id: string
  emailListId: string
  recipientId: string
  recipient?: RecipientDto
  recipientType: RecipientType
  role?: string | null
  priority: number
  createdAt: string
  updatedAt: string
}

export interface CredentialDto {
  id: string
  applicationId: string
  application?: ApplicationDto
  apiKey?: string
  name: string
  description: string | null
  status: Status
  createdAt: string
  updatedAt: string
}

export interface AuditLogDto {
  id: string
  userId: string | null
  user?: { name: string; email: string } | null
  action: string
  entityType: string
  entityId: string | null
  oldValue?: unknown
  newValue?: unknown
  ipAddress: string | null
  createdAt: string
}

export interface LoginResponse {
  token: string
  user: AdminUserDto
}

export interface Paginated<T> {
  total: number
  page: number
  limit: number
}