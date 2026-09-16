import { MiddlewareHandler } from 'hono'
import { AppEnv, ApplicationRow, CredentialRow } from '../types'
import { unauthorized } from '../errors'

interface CredentialWithApp extends CredentialRow {
  app_code: string
  app_name: string
  app_description: string | null
  app_status: ApplicationRow['status']
  app_created_at: string
  app_updated_at: string
}

export const appGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const apiKey =
    c.req.header('X-API-Key') ||
    (c.req.header('Authorization') ?? '').replace('Bearer ', '')

  if (!apiKey) {
    throw unauthorized('API key is required')
  }

  let credential: CredentialWithApp | null
  try {
    credential = await c.env.DB.prepare(
      `SELECT
         cred.id, cred.application_id, cred.api_key, cred.name, cred.description,
         cred.status, cred.created_at, cred.updated_at,
         app.code AS app_code, app.name AS app_name, app.description AS app_description,
         app.status AS app_status, app.created_at AS app_created_at, app.updated_at AS app_updated_at
       FROM application_credentials cred
       JOIN applications app ON app.id = cred.application_id
       WHERE cred.api_key = ?`,
    )
      .bind(apiKey)
      .first<CredentialWithApp>()
  } catch {
    throw unauthorized('Invalid API key')
  }

  if (!credential || credential.status !== 'ACTIVE') {
    throw unauthorized('Invalid API key')
  }

  if (credential.app_status !== 'ACTIVE') {
    throw unauthorized('Application is inactive')
  }

  c.set('application', {
    id: credential.application_id,
    code: credential.app_code,
    name: credential.app_name,
    description: credential.app_description,
    status: credential.app_status,
    created_at: credential.app_created_at,
    updated_at: credential.app_updated_at,
  })
  await next()
}