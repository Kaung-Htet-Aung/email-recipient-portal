import { Hono } from 'hono'
import { AppEnv, CredentialDto } from '../types'
import { parseBody, createCredentialSchema } from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import { applicationFromJoined, generateApiKey, mapCredentialRow, now, uuid } from '../db'
import { notFound } from '../errors'

export const credentialRoutes = new Hono<AppEnv>()
credentialRoutes.use('*', adminGuard)

const APP_FIELDS = `
  app.id AS app_id, app.code AS app_code, app.name AS app_name,
  app.description AS app_description, app.status AS app_status,
  app.created_at AS app_created_at, app.updated_at AS app_updated_at
`

const CREDENTIAL_WITH_APP = `
  SELECT
    cred.id, cred.application_id, cred.api_key, cred.name, cred.description,
    cred.status, cred.created_at, cred.updated_at,
    ${APP_FIELDS}
  FROM application_credentials cred
  JOIN applications app ON app.id = cred.application_id
`

function toCredential(row: Record<string, unknown>): CredentialDto {
  const cred = mapCredentialRow(row)
  return {
    id: cred.id,
    applicationId: cred.application_id,
    application: applicationFromJoined(row),
    name: cred.name,
    description: cred.description,
    status: cred.status,
    createdAt: cred.created_at,
    updatedAt: cred.updated_at,
  }
}

async function findCredential(db: D1Database, id: string) {
  const row = await db
    .prepare(`${CREDENTIAL_WITH_APP} WHERE cred.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('Credential not found')
  return row
}

credentialRoutes.get('/', async (c) => {
  const applicationId = c.req.query('applicationId')
  const stmt = applicationId
    ? c.env.DB.prepare(
        `${CREDENTIAL_WITH_APP} WHERE cred.application_id = ? ORDER BY cred.created_at DESC`,
      ).bind(applicationId)
    : c.env.DB.prepare(`${CREDENTIAL_WITH_APP} ORDER BY cred.created_at DESC`)
  const rows = await stmt.all<Record<string, unknown>>()
  return c.json(rows.results.map(toCredential))
})

credentialRoutes.post('/applications/:applicationId', async (c) => {
  const db = c.env.DB
  const applicationId = c.req.param('applicationId')
  const body = await parseBody(c, createCredentialSchema)

  const app = await db
    .prepare('SELECT * FROM applications WHERE id = ?')
    .bind(applicationId)
    .first()
  if (!app) throw notFound('Application not found')

  const id = uuid()
  const apiKey = generateApiKey()
  const ts = now()
  await db
    .prepare(
      `INSERT INTO application_credentials
         (id, application_id, api_key, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .bind(id, applicationId, apiKey, body.name, body.description ?? null, ts, ts)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'CREATE_CREDENTIAL',
    entityType: 'ApplicationCredential',
    entityId: id,
    newValue: {
      applicationId,
      applicationCode: app.code,
      name: body.name,
    },
  })

  return c.json(
    { id, applicationId, name: body.name, description: body.description ?? null, status: 'ACTIVE', apiKey, createdAt: ts, updatedAt: ts },
    201,
  )
})

credentialRoutes.patch('/:id/revoke', async (c) => {
  const db = c.env.DB
  const row = await findCredential(db, c.req.param('id'))
  const cred = mapCredentialRow(row)

  const status = cred.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const ts = now()
  await db
    .prepare('UPDATE application_credentials SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, ts, cred.id)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'TOGGLE_CREDENTIAL_STATUS',
    entityType: 'ApplicationCredential',
    entityId: cred.id,
    oldValue: { status: cred.status },
    newValue: { status },
  })

  return c.json({
    id: cred.id,
    applicationId: cred.application_id,
    name: cred.name,
    description: cred.description,
    status,
    createdAt: cred.created_at,
    updatedAt: ts,
  })
})

credentialRoutes.patch('/:id/regenerate', async (c) => {
  const db = c.env.DB
  const row = await findCredential(db, c.req.param('id'))
  const cred = mapCredentialRow(row)

  const apiKey = generateApiKey()
  const ts = now()
  await db
    .prepare('UPDATE application_credentials SET api_key = ?, updated_at = ? WHERE id = ?')
    .bind(apiKey, ts, cred.id)
    .run()

  await recordAudit(db, {
    userId: c.get('admin')!.id,
    action: 'REGENERATE_CREDENTIAL',
    entityType: 'ApplicationCredential',
    entityId: cred.id,
  })

  return c.json({
    id: cred.id,
    applicationId: cred.application_id,
    name: cred.name,
    description: cred.description,
    status: cred.status,
    apiKey,
    createdAt: cred.created_at,
    updatedAt: ts,
  })
})