import { Hono } from 'hono'
import { AppEnv, DepartmentDto, DepartmentRow } from '../types'
import { parseBody, createCodeNameSchema, updateCodeNameSchema } from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import {
  DEPARTMENT_WITH_COUNTS_SELECT_SQL,
  DEPARTMENT_SELECT_SQL,
  mapDepartmentRow,
  toDepartment,
  buildUpdateStatement,
  now,
  uuid,
} from '../db'
import { conflict, notFound } from '../errors'

export const departmentRoutes = new Hono<AppEnv>()
departmentRoutes.use('*', adminGuard)

function withCounts(row: Record<string, unknown>): DepartmentDto {
  return {
    ...toDepartment(mapDepartmentRow(row)),
    _count: { recipients: row.recipient_count as number },
  }
}

departmentRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${DEPARTMENT_WITH_COUNTS_SELECT_SQL} FROM departments d ORDER BY d.created_at DESC`,
  ).all<Record<string, unknown>>()
  return c.json(rows.results.map(withCounts))
})

departmentRoutes.get('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const row = await db
    .prepare(`SELECT * FROM departments WHERE id = ?`)
    .bind(id)
    .first<DepartmentRow>()
  if (!row) throw notFound('Department not found')

  const recipients = await db
    .prepare(
      `SELECT ${RECIPIENT_SELECT_SQL} FROM email_recipients r
       WHERE r.department_id = ?
       ORDER BY r.created_at DESC`,
    )
    .bind(id)
    .all<Record<string, unknown>>()

  return c.json({
    ...toDepartment(row),
    recipients: recipients.results.map((r) => ({
      id: r.id as string,
      employeeCode: r.employee_code as string,
      name: r.name as string,
      email: r.email as string,
      departmentId: r.department_id as string | null,
      status: r.status as DepartmentDto['status'],
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    })),
  })
})

departmentRoutes.post('/', async (c) => {
  const db = c.env.DB
  const body = await parseBody(c, createCodeNameSchema)
  const code = body.code.toUpperCase()

  const existing = await db
    .prepare('SELECT id FROM departments WHERE code = ?')
    .bind(code)
    .first()
  if (existing) throw conflict(`Department with code ${code} already exists`)

  const id = uuid()
  const ts = now()
  await db
    .prepare(
      `INSERT INTO departments (id, code, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .bind(id, code, body.name, body.description ?? null, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'CREATE_DEPARTMENT',
    entityType: 'Department',
    entityId: id,
    newValue: { code, name: body.name, description: body.description },
  })

  const row = await db
    .prepare(`SELECT ${DEPARTMENT_SELECT_SQL} FROM departments d WHERE d.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(toDepartment(mapDepartmentRow(row!)), 201)
})

departmentRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const dept = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(id)
    .first<DepartmentRow>()
  if (!dept) throw notFound('Department not found')

  const body = await parseBody(c, updateCodeNameSchema)
  let code = dept.code
  if (body.code) {
    code = body.code.toUpperCase()
    if (code !== dept.code) {
      const existing = await db
        .prepare('SELECT id FROM departments WHERE code = ?')
        .bind(code)
        .first()
      if (existing) throw conflict(`Department with code ${code} already exists`)
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

  await db.prepare(buildUpdateStatement('departments', columns)).bind(...values, id).run()

  const updated = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(id)
    .first<DepartmentRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'UPDATE_DEPARTMENT',
    entityType: 'Department',
    entityId: id,
    oldValue: {
      code: dept.code,
      name: dept.name,
      description: dept.description,
      status: dept.status,
    },
    newValue: {
      code: updated!.code,
      name: updated!.name,
      description: updated!.description,
      status: updated!.status,
    },
  })

  return c.json(toDepartment(updated!))
})

departmentRoutes.patch('/:id/toggle-status', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const dept = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(id)
    .first<DepartmentRow>()
  if (!dept) throw notFound('Department not found')

  const status = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  await db
    .prepare(`UPDATE departments SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, now(), id)
    .run()

  const updated = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(id)
    .first<DepartmentRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'TOGGLE_DEPARTMENT_STATUS',
    entityType: 'Department',
    entityId: id,
    oldValue: { status: dept.status },
    newValue: { status: updated!.status },
  })

  return c.json(toDepartment(updated!))
})

departmentRoutes.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const dept = await db
    .prepare('SELECT * FROM departments WHERE id = ?')
    .bind(id)
    .first<DepartmentRow>()
  if (!dept) throw notFound('Department not found')

  await db
    .prepare('UPDATE email_recipients SET department_id = NULL, updated_at = ? WHERE department_id = ?')
    .bind(now(), id)
    .run()
  await db.prepare('DELETE FROM departments WHERE id = ?').bind(id).run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'DELETE_DEPARTMENT',
    entityType: 'Department',
    entityId: id,
    oldValue: {
      code: dept.code,
      name: dept.name,
      description: dept.description,
      status: dept.status,
    },
  })

  return c.json(toDepartment(dept))
})

const RECIPIENT_SELECT_SQL = `
  r.id, r.employee_code, r.name, r.email, r.department_id, r.status, r.created_at, r.updated_at
`