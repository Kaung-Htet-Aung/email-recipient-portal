import { Hono } from 'hono'
import { AppEnv } from '../types'
import { parseQuery, queryAuditSchema } from '../validators'
import { adminGuard } from '../middleware/admin'
import { mapAuditRow, toAuditLog } from '../db'
import { notFound } from '../errors'

export const auditRoutes = new Hono<AppEnv>()
auditRoutes.use('*', adminGuard)

const AUDIT_SELECT = `
  SELECT log.id, log.user_id, log.action, log.entity_type, log.entity_id,
         log.old_value, log.new_value, log.ip_address, log.created_at,
         u.name AS user_name, u.email AS user_email
  FROM audit_logs log
  LEFT JOIN admin_users u ON u.id = log.user_id
`

function buildWhere(q: {
  search?: string
  entityType?: string
  action?: string
}): { where: string; binds: unknown[] } {
  const clauses: string[] = []
  const binds: unknown[] = []
  if (q.search) {
    clauses.push(`(log.action LIKE ? OR log.entity_type LIKE ? OR log.entity_id LIKE ?)`)
    binds.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`)
  }
  if (q.entityType) {
    clauses.push('log.entity_type = ?')
    binds.push(q.entityType)
  }
  if (q.action) {
    clauses.push('log.action = ?')
    binds.push(q.action)
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', binds }
}

function fromRow(row: Record<string, unknown>) {
  const log = mapAuditRow(row)
  return toAuditLog(log, row.user_id ? { name: row.user_name as string, email: row.user_email as string } : null)
}

auditRoutes.get('/', async (c) => {
  const q = parseQuery(queryAuditSchema, c.req.query())
  const { where, binds } = buildWhere(q)

  const [totalRow, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_logs log ${where}`)
      .bind(...binds)
      .first<{ total: number }>(),
    c.env.DB.prepare(`${AUDIT_SELECT} ${where} ORDER BY log.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, q.limit, (q.page - 1) * q.limit)
      .all<Record<string, unknown>>(),
  ])

  return c.json({ logs: rows.results.map(fromRow), total: totalRow?.total ?? 0, page: q.page, limit: q.limit })
})

auditRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(`${AUDIT_SELECT} WHERE log.id = ?`)
    .bind(c.req.param('id'))
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Audit log not found')
  return c.json(fromRow(row))
})