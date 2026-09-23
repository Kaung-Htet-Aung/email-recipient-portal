import {
  AdminRow,
  ApplicationDto,
  ApplicationRow,
  AuditLogDto,
  AuditRow,
  CredentialDto,
  CredentialRow,
  DepartmentDto,
  DepartmentRow,
  EmailListDto,
  EmailListRow,
  MembershipDto,
  MembershipRow,
  RecipientDto,
  RecipientRow,
} from './types'

export function now(): string {
  return new Date().toISOString()
}

export function uuid(): string {
  return crypto.randomUUID()
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `erp_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function safeJsonParse(value: string | null): unknown {
  if (value === null || value === undefined) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// Row mappers (snake_case rows -> camelCase DTOs) -----------------------------

export function toApplication(row: ApplicationRow): ApplicationDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toDepartment(row: DepartmentRow): DepartmentDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toRecipient(row: RecipientRow, department?: DepartmentDto | null): RecipientDto {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    departmentId: row.department_id,
    department: department ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toEmailList(row: EmailListRow, application?: ApplicationDto): EmailListDto {
  return {
    id: row.id,
    applicationId: row.application_id,
    application,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toMembership(
  row: MembershipRow,
  recipient?: RecipientDto | null,
): MembershipDto {
  return {
    id: row.id,
    emailListId: row.email_list_id,
    recipientId: row.recipient_id,
    recipient: recipient ?? undefined,
    recipientType: row.recipient_type,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCredential(row: CredentialRow, application?: ApplicationDto): CredentialDto {
  const { api_key, ...rest } = row
  return {
    ...rest,
    applicationId: row.application_id,
    application,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toAuditLog(row: AuditRow, user?: { name: string; email: string } | null): AuditLogDto {
  return {
    id: row.id,
    userId: row.user_id,
    user: user ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: safeJsonParse(row.old_value),
    newValue: safeJsonParse(row.new_value),
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }
}

// SQL fragments --------------------------------------------------------------

export const APPLICATION_COUNTS_SQL = `
  (SELECT COUNT(*) FROM email_lists WHERE application_id = a.id) AS email_lists_count,
  (SELECT COUNT(*) FROM application_credentials WHERE application_id = a.id) AS credentials_count
`

export const APPLICATION_SELECT_SQL = `
  a.id, a.code, a.name, a.description, a.status, a.created_at, a.updated_at
`

export const APPLICATION_WITH_COUNTS_SELECT_SQL = `
  a.id, a.code, a.name, a.description, a.status, a.created_at, a.updated_at,
  ${APPLICATION_COUNTS_SQL}
`

export const DEPARTMENT_COUNTS_SQL = `
  (SELECT COUNT(*) FROM email_recipients WHERE department_id = d.id) AS recipient_count
`

export const DEPARTMENT_SELECT_SQL = `
  d.id, d.code, d.name, d.description, d.status, d.created_at, d.updated_at
`

export const DEPARTMENT_WITH_COUNTS_SELECT_SQL = `
  d.id, d.code, d.name, d.description, d.status, d.created_at, d.updated_at,
  ${DEPARTMENT_COUNTS_SQL}
`

export const APPLICATION_FIELDS_SQL = `
  app.id AS app_id, app.code AS app_code, app.name AS app_name,
  app.description AS app_description, app.status AS app_status,
  app.created_at AS app_created_at, app.updated_at AS app_updated_at
`

export const DEPARTMENT_FIELDS_SQL = `
  d.id AS d_id, d.code AS d_code, d.name AS d_name, d.description AS d_description,
  d.status AS d_status, d.created_at AS d_created_at, d.updated_at AS d_updated_at
`

export const RECIPIENT_FIELDS_SQL = `
  r.id, r.employee_code, r.name, r.email, r.department_id, r.status, r.created_at, r.updated_at
`

export const MEMBERSHIP_FIELDS_SQL = `
  m.id, m.email_list_id, m.recipient_id, m.recipient_type, m.priority, m.created_at, m.updated_at
`

export function mapApplicationRow(row: Record<string, unknown>): ApplicationRow {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as ApplicationRow['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapDepartmentRow(row: Record<string, unknown>): DepartmentRow {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as DepartmentRow['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapRecipientRow(row: Record<string, unknown>): RecipientRow {
  return {
    id: row.id as string,
    employee_code: row.employee_code as string,
    name: row.name as string,
    email: row.email as string,
    department_id: (row.department_id as string | null) ?? null,
    status: row.status as RecipientRow['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapEmailListRow(row: Record<string, unknown>): EmailListRow {
  return {
    id: row.id as string,
    application_id: row.application_id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as EmailListRow['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapMembershipRow(row: Record<string, unknown>): MembershipRow {
  return {
    id: row.m_id as string,
    email_list_id: row.m_email_list_id as string,
    recipient_id: row.m_recipient_id as string,
    recipient_type: row.m_recipient_type as MembershipRow['recipient_type'],
    priority: row.m_priority as number,
    created_at: row.m_created_at as string,
    updated_at: row.m_updated_at as string,
  }
}

export function mapCredentialRow(row: Record<string, unknown>): CredentialRow {
  return {
    id: row.id as string,
    application_id: row.application_id as string,
    api_key: row.api_key as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as CredentialRow['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapAuditRow(row: Record<string, unknown>): AuditRow {
  return {
    id: row.id as string,
    user_id: (row.user_id as string | null) ?? null,
    action: row.action as string,
    entity_type: row.entity_type as string,
    entity_id: (row.entity_id as string | null) ?? null,
    old_value: (row.old_value as string | null) ?? null,
    new_value: (row.new_value as string | null) ?? null,
    ip_address: (row.ip_address as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export function applicationFromJoined(row: Record<string, unknown>): ApplicationDto {
  return {
    id: row.app_id as string,
    code: row.app_code as string,
    name: row.app_name as string,
    description: (row.app_description as string | null) ?? null,
    status: row.app_status as ApplicationDto['status'],
    createdAt: row.app_created_at as string,
    updatedAt: row.app_updated_at as string,
  }
}

export function departmentFromJoined(row: Record<string, unknown>): DepartmentDto | null {
  if (!row.d_id) return null
  return {
    id: row.d_id as string,
    code: row.d_code as string,
    name: row.d_name as string,
    description: (row.d_description as string | null) ?? null,
    status: row.d_status as DepartmentDto['status'],
    createdAt: row.d_created_at as string,
    updatedAt: row.d_updated_at as string,
  }
}

export function recipientFromJoined(row: Record<string, unknown>): RecipientDto {
  const rec = mapRecipientRow(row)
  const dept: DepartmentRow = {
    id: row.d_id as string,
    code: row.d_code as string,
    name: row.d_name as string,
    description: (row.d_description as string | null) ?? null,
    status: row.d_status as DepartmentRow['status'],
    created_at: row.d_created_at as string,
    updated_at: row.d_updated_at as string,
  }
  return toRecipient(rec, row.d_id ? toDepartment(dept) : null)
}

export function emailListFromJoined(row: Record<string, unknown>): EmailListDto {
  const list = mapEmailListRow(row)
  return toEmailList(list, applicationFromJoined(row))
}

export function membershipFromJoined(
  row: Record<string, unknown>,
  recipient?: RecipientDto | null,
): MembershipDto {
  const membership = mapMembershipRow(row)
  return toMembership(membership, recipient)
}

// Builds `UPDATE <table> SET c1 = ?, c2 = ? WHERE <primary> = ?` for the
// columns that were actually provided. Bind values in the same order as
// `columns`, then the primary key id last.
export function buildUpdateStatement(table: string, columns: string[], primary = 'id') {
  const set = columns.map((c) => `${c} = ?`).join(', ')
  return `UPDATE ${table} SET ${set} WHERE ${primary} = ?`
}