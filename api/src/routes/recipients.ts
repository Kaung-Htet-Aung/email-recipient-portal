import { Hono } from 'hono'
import { AppEnv, RecipientRow } from '../types'
import {
  parseBody,
  parseQuery,
  createRecipientSchema,
  updateRecipientSchema,
  queryRecipientSchema,
} from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import {
  RECIPIENT_FIELDS_SQL,
  DEPARTMENT_FIELDS_SQL,
  recipientFromJoined,
  buildUpdateStatement,
  now,
  uuid,
} from '../db'
import { conflict, notFound } from '../errors'

export const recipientRoutes = new Hono<AppEnv>()
recipientRoutes.use('*', adminGuard)

const BASE_SELECT = `
  SELECT ${RECIPIENT_FIELDS_SQL}, ${DEPARTMENT_FIELDS_SQL}
  FROM email_recipients r
  LEFT JOIN departments d ON d.id = r.department_id
`

function buildWhere(q: {
  search?: string
  departmentId?: string
  status?: string
}): { where: string; binds: unknown[] } {
  const clauses: string[] = []
  const binds: unknown[] = []
  if (q.search) {
    clauses.push(`(r.name LIKE ? OR r.email LIKE ? OR r.employee_code LIKE ?)`)
    binds.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`)
  }
  if (q.departmentId) {
    clauses.push('r.department_id = ?')
    binds.push(q.departmentId)
  }
  if (q.status) {
    clauses.push('r.status = ?')
    binds.push(q.status)
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', binds }
}

recipientRoutes.get('/', async (c) => {
  const q = parseQuery(queryRecipientSchema, c.req.query())
  const { where, binds } = buildWhere(q)

  const [totalRow, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM email_recipients r ${where}`)
      .bind(...binds)
      .first<{ total: number }>(),
    c.env.DB.prepare(
      `${BASE_SELECT} ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...binds, q.limit, (q.page - 1) * q.limit)
      .all<Record<string, unknown>>(),
  ])

  const recipients = rows.results.map(recipientFromJoined)
  return c.json({ recipients, total: totalRow?.total ?? 0, page: q.page, limit: q.limit })
})

recipientRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(`${BASE_SELECT} WHERE r.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Recipient not found')
  return c.json(recipientFromJoined(row))
})

recipientRoutes.post('/', async (c) => {
  const db = c.env.DB
  const body = await parseBody(c, createRecipientSchema)

  const existingEmail = await db
    .prepare('SELECT id FROM email_recipients WHERE email = ?')
    .bind(body.email)
    .first()
  if (existingEmail) throw conflict(`Recipient with email ${body.email} already exists`)

  const existingCode = await db
    .prepare('SELECT id FROM email_recipients WHERE employee_code = ?')
    .bind(body.employeeCode)
    .first()
  if (existingCode) {
    throw conflict(`Recipient with employee code ${body.employeeCode} already exists`)
  }

  const id = uuid()
  const ts = now()
  await db
    .prepare(
      `INSERT INTO email_recipients (id, employee_code, name, email, department_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .bind(id, body.employeeCode, body.name, body.email, body.departmentId ?? null, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'CREATE_RECIPIENT',
    entityType: 'EmailRecipient',
    entityId: id,
    newValue: {
      employeeCode: body.employeeCode,
      name: body.name,
      email: body.email,
    },
  })

  const row = await db.prepare(`${BASE_SELECT} WHERE r.id = ?`).bind(id).first<Record<string, unknown>>()
  return c.json(recipientFromJoined(row!), 201)
})

recipientRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const recipient = await db
    .prepare('SELECT * FROM email_recipients WHERE id = ?')
    .bind(id)
    .first<RecipientRow>()
  if (!recipient) throw notFound('Recipient not found')

  const body = await parseBody(c, updateRecipientSchema)

  if (body.email && body.email !== recipient.email) {
    const existing = await db
      .prepare('SELECT id FROM email_recipients WHERE email = ?')
      .bind(body.email)
      .first()
    if (existing) throw conflict(`Recipient with email ${body.email} already exists`)
  }

  if (body.employeeCode && body.employeeCode !== recipient.employee_code) {
    const existing = await db
      .prepare('SELECT id FROM email_recipients WHERE employee_code = ?')
      .bind(body.employeeCode)
      .first()
    if (existing) throw conflict(`Recipient with employee code ${body.employeeCode} already exists`)
  }

  const columns: string[] = []
  const values: unknown[] = []
  if (body.employeeCode) {
    columns.push('employee_code')
    values.push(body.employeeCode)
  }
  if (body.name !== undefined) {
    columns.push('name')
    values.push(body.name)
  }
  if (body.email !== undefined) {
    columns.push('email')
    values.push(body.email)
  }
  if (body.departmentId !== undefined) {
    columns.push('department_id')
    values.push(body.departmentId)
  }
  columns.push('updated_at')
  values.push(now())

  await db.prepare(buildUpdateStatement('email_recipients', columns)).bind(...values, id).run()

  const updated = await db
    .prepare('SELECT * FROM email_recipients WHERE id = ?')
    .bind(id)
    .first<RecipientRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'UPDATE_RECIPIENT',
    entityType: 'EmailRecipient',
    entityId: id,
    oldValue: {
      employeeCode: recipient.employee_code,
      name: recipient.name,
      email: recipient.email,
      departmentId: recipient.department_id,
      status: recipient.status,
    },
    newValue: {
      employeeCode: updated!.employee_code,
      name: updated!.name,
      email: updated!.email,
      departmentId: updated!.department_id,
      status: updated!.status,
    },
  })

  const row = await db.prepare(`${BASE_SELECT} WHERE r.id = ?`).bind(id).first<Record<string, unknown>>()
  return c.json(recipientFromJoined(row!))
})

recipientRoutes.patch('/:id/toggle-status', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const recipient = await db
    .prepare('SELECT * FROM email_recipients WHERE id = ?')
    .bind(id)
    .first<RecipientRow>()
  if (!recipient) throw notFound('Recipient not found')

  const status = recipient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  await db
    .prepare('UPDATE email_recipients SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now(), id)
    .run()

  const updated = await db
    .prepare('SELECT * FROM email_recipients WHERE id = ?')
    .bind(id)
    .first<RecipientRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'TOGGLE_RECIPIENT_STATUS',
    entityType: 'EmailRecipient',
    entityId: id,
    oldValue: { status: recipient.status },
    newValue: { status: updated!.status },
  })

  const row = await db.prepare(`${BASE_SELECT} WHERE r.id = ?`).bind(id).first<Record<string, unknown>>()
  return c.json(recipientFromJoined(row!))
})