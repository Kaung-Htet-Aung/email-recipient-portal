import { verify } from 'hono/jwt'
import { MiddlewareHandler } from 'hono'
import { AppEnv, AdminRow } from '../types'
import { unauthorized } from '../errors'

export const adminGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    throw unauthorized('Unauthorized')
  }

  let payload: { sub?: string }
  try {
    payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as { sub?: string }
  } catch {
    throw unauthorized('Unauthorized')
  }

  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(payload.sub ?? '')
    .first<AdminRow>()

  if (!user || user.status !== 'ACTIVE') {
    throw unauthorized('User not found or inactive')
  }

  c.set('admin', user)
  await next()
}