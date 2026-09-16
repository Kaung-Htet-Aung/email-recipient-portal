import { Hono } from 'hono'
import { AppEnv } from '../types'
import { adminGuard } from '../middleware/admin'
import {
  APPLICATION_FIELDS_SQL,
  DEPARTMENT_FIELDS_SQL,
  RECIPIENT_FIELDS_SQL,
  mapAuditRow,
  toAuditLog,
  emailListFromJoined,
  recipientFromJoined,
} from '../db'

export const dashboardRoutes = new Hono<AppEnv>()
dashboardRoutes.use('*', adminGuard)

dashboardRoutes.get('/', async (c) => {
  const db = c.env.DB

  const [
    applicationCount,
    emailListCount,
    recipientCount,
    departmentCount,
    activeListCount,
    inactiveListCount,
    activeRecipientCount,
    inactiveRecipientCount,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS c FROM applications').first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM email_lists').first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM email_recipients').first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM departments').first<{ c: number }>(),
    db.prepare(`SELECT COUNT(*) AS c FROM email_lists WHERE status = 'ACTIVE'`).first<{ c: number }>(),
    db.prepare(`SELECT COUNT(*) AS c FROM email_lists WHERE status = 'INACTIVE'`).first<{ c: number }>(),
    db.prepare(`SELECT COUNT(*) AS c FROM email_recipients WHERE status = 'ACTIVE'`).first<{ c: number }>(),
    db.prepare(`SELECT COUNT(*) AS c FROM email_recipients WHERE status = 'INACTIVE'`).first<{ c: number }>(),
  ])

  const [recentAuditLogs, recentLists, recentRecipients] = await Promise.all([
    db
      .prepare(
        `SELECT log.id, log.user_id, log.action, log.entity_type, log.entity_id,
                log.old_value, log.new_value, log.ip_address, log.created_at,
                u.name AS user_name, u.email AS user_email
         FROM audit_logs log
         LEFT JOIN admin_users u ON u.id = log.user_id
         ORDER BY log.created_at DESC LIMIT 5`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT l.id, l.application_id, l.code, l.name, l.description, l.status, l.created_at, l.updated_at,
                ${APPLICATION_FIELDS_SQL},
                (SELECT COUNT(*) FROM email_list_recipients WHERE email_list_id = l.id) AS recipients_count
         FROM email_lists l JOIN applications app ON app.id = l.application_id
         ORDER BY l.created_at DESC LIMIT 5`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT ${RECIPIENT_FIELDS_SQL}, ${DEPARTMENT_FIELDS_SQL}
         FROM email_recipients r LEFT JOIN departments d ON d.id = r.department_id
         ORDER BY r.created_at DESC LIMIT 5`,
      )
      .all<Record<string, unknown>>(),
  ])

  return c.json({
    counts: {
      applications: applicationCount?.c ?? 0,
      emailLists: emailListCount?.c ?? 0,
      recipients: recipientCount?.c ?? 0,
      departments: departmentCount?.c ?? 0,
      activeLists: activeListCount?.c ?? 0,
      inactiveLists: inactiveListCount?.c ?? 0,
      activeRecipients: activeRecipientCount?.c ?? 0,
      inactiveRecipients: inactiveRecipientCount?.c ?? 0,
    },
    recentAuditLogs: recentAuditLogs.results.map((row) => {
      const log = mapAuditRow(row)
      return toAuditLog(
        log,
        row.user_id ? { name: row.user_name as string, email: row.user_email as string } : null,
      )
    }),
    recentLists: recentLists.results.map((row) => ({
      ...emailListFromJoined(row),
      _count: { recipients: row.recipients_count as number },
    })),
    recentRecipients: recentRecipients.results.map(recipientFromJoined),
  })
})