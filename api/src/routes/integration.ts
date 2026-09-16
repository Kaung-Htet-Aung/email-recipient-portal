import { Hono } from 'hono'
import { AppEnv } from '../types'
import { appGuard } from '../middleware/app-guard'
import { forbidden, notFound } from '../errors'

const MEMBERS_WITH_RECIPIENT = `
  SELECT r.name, r.email, r.status, m.recipient_type
  FROM email_list_recipients m
  JOIN email_recipients r ON r.id = m.recipient_id
`

export const integrationRoutes = new Hono<AppEnv>()


integrationRoutes.get('/:applicationCode/:listCode', appGuard, async (c) => {
  const applicationCode = c.req.param('applicationCode')
  const listCode = c.req.param('listCode')
  const app = c.get('application')!

  if (applicationCode !== app.code) {
    throw forbidden('Application is not allowed to access this email list')
  }

  const list = await c.env.DB
    .prepare('SELECT id, code, status FROM email_lists WHERE application_id = ? AND code = ?')
    .bind(app.id, listCode)
    .first<{ id: string; code: string; status: string }>()
  if (!list || list.status !== 'ACTIVE') {
    throw notFound('Email list not found')
  }

  const members = await c.env.DB
    .prepare(
      `${MEMBERS_WITH_RECIPIENT} WHERE m.email_list_id = ?
       ORDER BY
         CASE m.recipient_type WHEN 'TO' THEN 0 WHEN 'CC' THEN 1 ELSE 2 END ASC,
         m.priority ASC`,
    )
    .bind(list.id)
    .all<{ name: string; email: string; status: string; recipient_type: string }>()

  const recipients = members.results
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({ name: m.name, email: m.email, type: m.recipient_type }))

  return c.json({ application: app.code, list: list.code, recipients })
})