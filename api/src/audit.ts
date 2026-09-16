import { uuid, now } from './db'

export interface AuditRecordInput {
  userId?: string
  action: string
  entityType: string
  entityId?: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
}

export async function recordAudit(db: D1Database, record: AuditRecordInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      uuid(),
      record.userId ?? null,
      record.action,
      record.entityType,
      record.entityId ?? null,
      record.oldValue === undefined ? null : JSON.stringify(record.oldValue),
      record.newValue === undefined ? null : JSON.stringify(record.newValue),
      record.ipAddress ?? null,
      now(),
    )
    .run()
}