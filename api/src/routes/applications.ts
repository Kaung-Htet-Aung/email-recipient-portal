import { Hono } from 'hono'
import { AppEnv, ApplicationDto, ApplicationRow } from '../types'
import { parseBody, createCodeNameSchema, updateCodeNameSchema } from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import {
  APPLICATION_WITH_COUNTS_SELECT_SQL,
  APPLICATION_SELECT_SQL,
  mapApplicationRow,
  toApplication,
  buildUpdateStatement,
  now,
  uuid,
} from '../db'
import { conflict, notFound } from '../errors'

export const applicationRoutes = new Hono<AppEnv>()
applicationRoutes.use('*', adminGuard)

function withCounts(row: Record<string, unknown>): ApplicationDto {
  return {
    ...toApplication(mapApplicationRow(row)),
    _count: {
      emailLists: row.email_lists_count as number,
      credentials: row.credentials_count as number,
    },
  }
}

async function findById(db: D1Database, id: string) {
  const row = await db
    .prepare(
      `SELECT ${APPLICATION_WITH_COUNTS_SELECT_SQL}
       FROM applications a WHERE a.id = ?`,
    )
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Application not found')
  return row
}

async function fetchFull(db: D1Database, id: string): Promise<ApplicationDto> {
  const row = await findById(db, id)

  const lists = await db
    .prepare(
      `SELECT
         l.id, l.application_id, l.code, l.name, l.description, l.status, l.created_at, l.updated_at,
         (SELECT COUNT(*) FROM email_list_recipients WHERE email_list_id = l.id) AS recipients_count
       FROM email_lists l
       WHERE l.application_id = ?
       ORDER BY l.created_at DESC`,
    )
    .bind(id)
    .all<Record<string, unknown>>()

  const credentials = await db
    .prepare(
      `SELECT id, application_id, name, description, status, created_at, updated_at
       FROM application_credentials
       WHERE application_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(id)
    .all<Record<string, unknown>>()

  return {
    ...withCounts(row),
    emailLists: lists.results.map((l) => ({
      id: l.id as string,
      applicationId: l.application_id as string,
      code: l.code as string,
      name: l.name as string,
      description: (l.description as string | null) ?? null,
      status: l.status as ApplicationDto['status'],
      createdAt: l.created_at as string,
      updatedAt: l.updated_at as string,
      _count: { recipients: l.recipients_count as number },
    })),
    credentials: credentials.results.map((cr) => ({
      id: cr.id as string,
      applicationId: cr.application_id as string,
      name: cr.name as string,
      description: (cr.description as string | null) ?? null,
      status: cr.status as ApplicationDto['status'],
      createdAt: cr.created_at as string,
      updatedAt: cr.updated_at as string,
    })),
  }
}

applicationRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${APPLICATION_WITH_COUNTS_SELECT_SQL} FROM applications a ORDER BY a.created_at DESC`,
  ).all<Record<string, unknown>>()
  return c.json(rows.results.map(withCounts))
})

applicationRoutes.get('/:id', async (c) => {
  return c.json(await fetchFull(c.env.DB, c.req.param('id')))
})

applicationRoutes.post('/', async (c) => {
  const db = c.env.DB
  const body = await parseBody(c, createCodeNameSchema)
  const code = body.code.toUpperCase()

  const existing = await db
    .prepare('SELECT id FROM applications WHERE code = ?')
    .bind(code)
    .first()
  if (existing) throw conflict(`Application with code ${code} already exists`)

  const id = uuid()
  const ts = now()
  await db
    .prepare(
      `INSERT INTO applications (id, code, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .bind(id, code, body.name, body.description ?? null, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'CREATE_APPLICATION',
    entityType: 'Application',
    entityId: id,
    newValue: { code, name: body.name, description: body.description },
  })

  const row = await db
    .prepare(`SELECT ${APPLICATION_SELECT_SQL} FROM applications a WHERE a.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(toApplication(mapApplicationRow(row!)), 201)
})

applicationRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const app = await db
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first<ApplicationRow>()
  if (!app) throw notFound('Application not found')

  const body = await parseBody(c, updateCodeNameSchema)
  let code = app.code
  if (body.code) {
    code = body.code.toUpperCase()
    if (code !== app.code) {
      const existing = await db
        .prepare('SELECT id FROM applications WHERE code = ?')
        .bind(code)
        .first()
      if (existing) throw conflict(`Application with code ${code} already exists`)
    }
  }

  const columns: string[] = []
  const values: unknown[] = []
  if (body.code) {
    columns.push('code')
    values.push(code)
  }
  if (body.name !== undefined) {
    columns.push('name')
    values.push(body.name)
  }
  if (body.description !== undefined) {
    columns.push('description')
    values.push(body.description)
  }
  columns.push('updated_at')
  values.push(now())

  await db.prepare(buildUpdateStatement('applications', columns)).bind(...values, id).run()

  const updated = await db
    .prepare(`SELECT * FROM applications WHERE id = ?`)
    .bind(id)
    .first<ApplicationRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'UPDATE_APPLICATION',
    entityType: 'Application',
    entityId: id,
    oldValue: {
      code: app.code,
      name: app.name,
      description: app.description,
      status: app.status,
    },
    newValue: {
      code: updated!.code,
      name: updated!.name,
      description: updated!.description,
      status: updated!.status,
    },
  })

  return c.json(toApplication(updated!))
})

applicationRoutes.patch('/:id/toggle-status', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const app = await db
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(id)
    .first<ApplicationRow>()
  if (!app) throw notFound('Application not found')

  const status = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  await db
    .prepare(`UPDATE applications SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, now(), id)
    .run()

  const updated = await db
    .prepare(`SELECT * FROM applications WHERE id = ?`)
    .bind(id)
    .first<ApplicationRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'TOGGLE_APPLICATION_STATUS',
    entityType: 'Application',
    entityId: id,
    oldValue: { status: app.status },
    newValue: { status: updated!.status },
  })

  return c.json(toApplication(updated!))
})