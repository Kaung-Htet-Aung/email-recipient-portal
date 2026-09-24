import { Hono } from 'hono'
import { AppEnv, EmailListRow, MembershipDto, MembershipRow } from '../types'
import {
  parseBody,
  createEmailListSchema,
  updateEmailListSchema,
  addRecipientSchema,
  updateRecipientTypeSchema,
} from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import {
  APPLICATION_FIELDS_SQL,
  RECIPIENT_FIELDS_SQL,
  DEPARTMENT_FIELDS_SQL,
  mapMembershipRow,
  emailListFromJoined,
  recipientFromJoined,
  buildUpdateStatement,
  now,
  uuid,
} from '../db'
import { badRequest, conflict, notFound } from '../errors'

export const emailListRoutes = new Hono<AppEnv>()


const LIST_WITH_APP_AND_COUNT = `
  SELECT l.id, l.application_id, l.code, l.name, l.description, l.status, l.created_at, l.updated_at,
    ${APPLICATION_FIELDS_SQL},
    (SELECT COUNT(*) FROM email_list_recipients WHERE email_list_id = l.id) AS recipients_count
  FROM email_lists l
  JOIN applications app ON app.id = l.application_id
`

const MEMBERS_SELECT = `
  SELECT
    m.id AS m_id, m.email_list_id AS m_email_list_id, m.recipient_id AS m_recipient_id,
    m.recipient_type AS m_recipient_type, m.role AS m_role, m.priority AS m_priority,
    m.created_at AS m_created_at, m.updated_at AS m_updated_at,
    ${RECIPIENT_FIELDS_SQL}, ${DEPARTMENT_FIELDS_SQL}
  FROM email_list_recipients m
  JOIN email_recipients r ON r.id = m.recipient_id
  LEFT JOIN departments d ON d.id = r.department_id
`

function membershipFromJoinedRow(row: Record<string, unknown>): MembershipDto {
  const membership = mapMembershipRow(row)
  return {
    id: membership.id,
    emailListId: membership.email_list_id,
    recipientId: membership.recipient_id,
    recipient: recipientFromJoined(row),
    recipientType: membership.recipient_type,
    role: membership.role,
    priority: membership.priority,
    createdAt: membership.created_at,
    updatedAt: membership.updated_at,
  }
}

async function findOneList(db: D1Database, id: string) {
  const row = await db
    .prepare(`${LIST_WITH_APP_AND_COUNT} WHERE l.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Email list not found')

  const members = await db
    .prepare(
      `${MEMBERS_SELECT} WHERE m.email_list_id = ?
       ORDER BY
         CASE m.recipient_type WHEN 'TO' THEN 0 WHEN 'CC' THEN 1 ELSE 2 END ASC,
         m.priority ASC`,
    )
    .bind(id)
    .all<Record<string, unknown>>()

  const list = emailListFromJoined(row)
  return {
    ...list,
    recipients: members.results.map(membershipFromJoinedRow),
    _count: { recipients: members.results.length },
  }
}

async function findMembership(db: D1Database, emailListId: string, recipientId: string) {
  return db
    .prepare(`${MEMBERS_SELECT} WHERE m.email_list_id = ? AND m.recipient_id = ?`)
    .bind(emailListId, recipientId)
    .first<Record<string, unknown>>()
}

emailListRoutes.get('/', adminGuard, async (c) => {
  const applicationId = c.req.query('applicationId')
  const where = applicationId ? 'WHERE l.application_id = ?' : ''
  const stmt = applicationId
    ? c.env.DB.prepare(`${LIST_WITH_APP_AND_COUNT} ${where} ORDER BY l.created_at DESC`).bind(applicationId)
    : c.env.DB.prepare(`${LIST_WITH_APP_AND_COUNT} ORDER BY l.created_at DESC`)

  const rows = await stmt.all<Record<string, unknown>>()
  return c.json(
    rows.results.map((row) => ({
      ...emailListFromJoined(row),
      _count: { recipients: row.recipients_count as number },
    })),
  )
})

emailListRoutes.get('/:id', adminGuard, async (c) => {
  return c.json(await findOneList(c.env.DB, c.req.param('id')))
})

emailListRoutes.post('/', adminGuard, async (c) => {
  const db = c.env.DB
  const body = await parseBody(c, createEmailListSchema)

  const app = await db
    .prepare('SELECT id FROM applications WHERE id = ?')
    .bind(body.applicationId)
    .first()
  if (!app) throw notFound('Application not found')

  const code = body.code.toUpperCase()
  const existing = await db
    .prepare('SELECT id FROM email_lists WHERE application_id = ? AND code = ?')
    .bind(body.applicationId, code)
    .first()
  if (existing) {
    throw conflict(`Email list with code ${code} already exists for this application`)
  }

  const id = uuid()
  const ts = now()
  await db
    .prepare(
      `INSERT INTO email_lists (id, application_id, code, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .bind(id, body.applicationId, code, body.name, body.description ?? null, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'CREATE_EMAIL_LIST',
    entityType: 'EmailList',
    entityId: id,
    newValue: {
      applicationId: body.applicationId,
      code,
      name: body.name,
      description: body.description,
    },
  })

  const row = await db
    .prepare(`${LIST_WITH_APP_AND_COUNT} WHERE l.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(
    { ...emailListFromJoined(row!), _count: { recipients: row!.recipients_count as number } },
    201,
  )
})

emailListRoutes.put('/:id', adminGuard, async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const list = await db
    .prepare('SELECT * FROM email_lists WHERE id = ?')
    .bind(id)
    .first<EmailListRow>()
  if (!list) throw notFound('Email list not found')

  const body = await parseBody(c, updateEmailListSchema)
  let code = list.code
  if (body.code) {
    code = body.code.toUpperCase()
    if (code !== list.code) {
      const existing = await db
        .prepare('SELECT id FROM email_lists WHERE application_id = ? AND code = ?')
        .bind(list.application_id, code)
        .first()
      if (existing) {
        throw conflict(`Email list with code ${code} already exists for this application`)
      }
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

  await db.prepare(buildUpdateStatement('email_lists', columns)).bind(...values, id).run()

  const updated = await db
    .prepare('SELECT * FROM email_lists WHERE id = ?')
    .bind(id)
    .first<EmailListRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'UPDATE_EMAIL_LIST',
    entityType: 'EmailList',
    entityId: id,
    oldValue: {
      code: list.code,
      name: list.name,
      description: list.description,
      status: list.status,
    },
    newValue: {
      code: updated!.code,
      name: updated!.name,
      description: updated!.description,
      status: updated!.status,
    },
  })

  const row = await db
    .prepare(`${LIST_WITH_APP_AND_COUNT} WHERE l.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(
    { ...emailListFromJoined(row!), _count: { recipients: row!.recipients_count as number } },
  )
})

emailListRoutes.patch('/:id/toggle-status', adminGuard, async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const list = await db
    .prepare('SELECT * FROM email_lists WHERE id = ?')
    .bind(id)
    .first<EmailListRow>()
  if (!list) throw notFound('Email list not found')

  const status = list.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  await db
    .prepare('UPDATE email_lists SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now(), id)
    .run()

  const updated = await db
    .prepare('SELECT * FROM email_lists WHERE id = ?')
    .bind(id)
    .first<EmailListRow>()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'TOGGLE_EMAIL_LIST_STATUS',
    entityType: 'EmailList',
    entityId: id,
    oldValue: { status: list.status },
    newValue: { status: updated!.status },
  })

  const row = await db
    .prepare(`${LIST_WITH_APP_AND_COUNT} WHERE l.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(
    { ...emailListFromJoined(row!), _count: { recipients: row!.recipients_count as number } },
  )
})

emailListRoutes.delete('/:id', adminGuard, async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const row = await db
    .prepare(`${LIST_WITH_APP_AND_COUNT} WHERE l.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Email list not found')

  await db.prepare('DELETE FROM email_lists WHERE id = ?').bind(id).run()

  const dto = emailListFromJoined(row)
  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'DELETE_EMAIL_LIST',
    entityType: 'EmailList',
    entityId: id,
    oldValue: {
      applicationId: dto.applicationId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      status: dto.status,
    },
  })

  return c.json(dto)
})

emailListRoutes.post('/:id/recipients', adminGuard, async (c) => {
  const db = c.env.DB
  const emailListId = c.req.param('id')
  const body = await parseBody(c, addRecipientSchema)

  const list = await db
    .prepare('SELECT id FROM email_lists WHERE id = ?')
    .bind(emailListId)
    .first()
  if (!list) throw notFound('Email list not found')

  const recipient = await db
    .prepare('SELECT * FROM email_recipients WHERE id = ?')
    .bind(body.recipientId)
    .first()
  if (!recipient) throw notFound('Recipient not found')
  if (recipient.status !== 'ACTIVE') {
    throw badRequest('Inactive recipients cannot be added to email lists')
  }

  const existing = await db
    .prepare('SELECT id FROM email_list_recipients WHERE email_list_id = ? AND recipient_id = ?')
    .bind(emailListId, body.recipientId)
    .first()
  if (existing) throw conflict('Recipient is already in this email list')

  const anchorId = body.beforeRecipientId ?? body.afterRecipientId
  const isBefore = Boolean(body.beforeRecipientId)
  let priority = body.priority ?? 0
  let placement: { before?: string; after?: string } | undefined

  if (anchorId) {
    const anchor = await db
      .prepare('SELECT * FROM email_list_recipients WHERE id = ? AND email_list_id = ?')
      .bind(anchorId, emailListId)
      .first<MembershipRow>()
    if (!anchor) throw notFound('Position recipient not found in this email list')

    const members = await db
      .prepare(
        `${MEMBERS_SELECT} WHERE m.email_list_id = ?
         ORDER BY
           CASE m.recipient_type WHEN 'TO' THEN 0 WHEN 'CC' THEN 1 ELSE 2 END ASC,
           m.priority ASC`,
      )
      .bind(emailListId)
      .all<Record<string, unknown>>()

    const orderedIds = members.results.map((m) => mapMembershipRow(m).id)
    const anchorIndex = orderedIds.indexOf(anchor.id)
    const insertIndex = isBefore ? anchorIndex : anchorIndex + 1
    orderedIds.splice(insertIndex, 0, 'NEW')

    priority = insertIndex
    placement = {
      before: isBefore ? anchor.recipient_id : undefined,
      after: !isBefore ? anchor.recipient_id : undefined,
    }

    const updates = orderedIds
      .map((id, idx) => (id === 'NEW' ? null : { id, idx }))
      .filter((u): u is { id: string; idx: number } => u !== null)
    await db.batch(
      updates.map((u) =>
        db.prepare('UPDATE email_list_recipients SET priority = ? WHERE id = ?').bind(u.idx, u.id),
      ),
    )
  }

  const id = uuid()
  const ts = now()
  const recipientType = body.recipientType ?? 'TO'
  const role = body.role ?? null
  await db
    .prepare(
      `INSERT INTO email_list_recipients
         (id, email_list_id, recipient_id, recipient_type, role, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, emailListId, body.recipientId, recipientType, role, priority, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'ADD_RECIPIENT_TO_LIST',
    entityType: 'EmailListRecipient',
    entityId: id,
    newValue: {
      emailListId,
      recipientId: body.recipientId,
      recipientEmail: recipient.email,
      recipientType,
      role,
      priority,
      ...(placement ? { placement } : {}),
    },
  })

  const row = await db
    .prepare(
      `SELECT ${RECIPIENT_FIELDS_SQL}, ${DEPARTMENT_FIELDS_SQL}
         FROM email_recipients r LEFT JOIN departments d ON d.id = r.department_id
         WHERE r.id = ?`,
    )
    .bind(body.recipientId)
    .first<Record<string, unknown>>()

  return c.json(
    {
      id,
      emailListId,
      recipientId: body.recipientId,
      recipient: recipientFromJoined(row!),
      recipientType,
      role,
      priority,
      createdAt: ts,
      updatedAt: ts,
    },
    201,
  )
})

emailListRoutes.delete('/:id/recipients/:recipientId', adminGuard, async (c) => {
  const db = c.env.DB
  const emailListId = c.req.param('id')
  const recipientId = c.req.param('recipientId')

  const membership = await findMembership(db, emailListId, recipientId)
  if (!membership) throw notFound('Recipient not found in this email list')

  const row = mapMembershipRow(membership)
  await db
    .prepare('DELETE FROM email_list_recipients WHERE id = ?')
    .bind(row.id)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'REMOVE_RECIPIENT_FROM_LIST',
    entityType: 'EmailListRecipient',
    entityId: row.id,
    oldValue: {
      emailListId,
      recipientId,
      recipientEmail: membership.email as string,
      recipientType: row.recipient_type,
      role: row.role,
    },
  })

  return c.json({ id: row.id, emailListId, recipientId, recipientType: row.recipient_type, role: row.role, priority: row.priority, createdAt: row.created_at, updatedAt: row.updated_at })
})

emailListRoutes.patch('/:id/recipients/:recipientId', adminGuard, async (c) => {
  const db = c.env.DB
  const emailListId = c.req.param('id')
  const recipientId = c.req.param('recipientId')
  const body = await parseBody(c, updateRecipientTypeSchema)

  const membership = await findMembership(db, emailListId, recipientId)
  if (!membership) throw notFound('Recipient not found in this email list')

  const current = mapMembershipRow(membership)
  const ts = now()
  const nextType = body.recipientType ?? current.recipient_type
  const nextRole = body.role !== undefined ? body.role : current.role
  const anchorId = body.beforeRecipientId ?? body.afterRecipientId
  const isBefore = Boolean(body.beforeRecipientId)
  let nextPriority = body.priority ?? current.priority
  let placement: { before?: string; after?: string } | undefined

  if (anchorId) {
    if (anchorId === current.id) {
      throw badRequest('Cannot position a recipient relative to itself')
    }
    const anchor = await db
      .prepare('SELECT * FROM email_list_recipients WHERE id = ? AND email_list_id = ?')
      .bind(anchorId, emailListId)
      .first<MembershipRow>()
    if (!anchor) throw notFound('Position recipient not found in this email list')

    const members = await db
      .prepare(
        `${MEMBERS_SELECT} WHERE m.email_list_id = ?
         ORDER BY
           CASE m.recipient_type WHEN 'TO' THEN 0 WHEN 'CC' THEN 1 ELSE 2 END ASC,
           m.priority ASC`,
      )
      .bind(emailListId)
      .all<Record<string, unknown>>()

    const orderedIds = members.results
      .map((m) => mapMembershipRow(m).id)
      .filter((id) => id !== current.id)
    const anchorIndex = orderedIds.indexOf(anchor.id)
    const insertIndex = isBefore ? anchorIndex : anchorIndex + 1
    orderedIds.splice(insertIndex, 0, current.id)

    nextPriority = insertIndex
    placement = {
      before: isBefore ? anchor.recipient_id : undefined,
      after: !isBefore ? anchor.recipient_id : undefined,
    }

    await db.batch(
      orderedIds.map((id, idx) =>
        id === current.id
          ? db
              .prepare(
                'UPDATE email_list_recipients SET recipient_type = ?, role = ?, priority = ?, updated_at = ? WHERE id = ?',
              )
              .bind(nextType, nextRole ?? null, idx, ts, id)
          : db
              .prepare('UPDATE email_list_recipients SET priority = ?, updated_at = ? WHERE id = ?')
              .bind(idx, ts, id),
      ),
    )
  } else {
    await db
      .prepare(
        'UPDATE email_list_recipients SET recipient_type = ?, role = ?, priority = ?, updated_at = ? WHERE id = ?',
      )
      .bind(nextType, nextRole ?? null, nextPriority, ts, current.id)
      .run()
  }

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'UPDATE_RECIPIENT_TYPE',
    entityType: 'EmailListRecipient',
    entityId: current.id,
    oldValue: {
      recipientType: current.recipient_type,
      role: current.role,
      priority: current.priority,
    },
    newValue: {
      recipientType: nextType,
      role: nextRole,
      priority: nextPriority,
      ...(placement ? { placement } : {}),
    },
  })

  return c.json({
    id: current.id,
    emailListId,
    recipientId,
    recipientType: nextType,
    role: nextRole,
    priority: nextPriority,
    createdAt: current.created_at,
    updatedAt: ts,
  })
})