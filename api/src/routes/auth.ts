import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { AppEnv, AdminRow } from '../types'
import { parseBody, loginSchema } from '../validators'
import { adminGuard } from '../middleware/admin'
import { recordAudit } from '../audit'
import { unauthorized } from '../errors'
import { verifyPassword } from '../password'

function jwtExpiry(expiresIn: string | undefined): number {
  const raw = expiresIn || '24h'
  const m = raw.match(/^(\d+)([smhd])$/)
  const secondsPerUnit: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  const amount = m ? parseInt(m[1], 10) : 24
  const unit = secondsPerUnit[m?.[2] || 'h'] || secondsPerUnit.h
  return Math.floor(Date.now() / 1000) + amount * unit
}

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/login', async (c) => {
  const body = await parseBody(c, loginSchema)

  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE email = ?')
    .bind(body.email)
    .first<AdminRow>()

  if (!user || user.status !== 'ACTIVE') {
    throw unauthorized('Invalid credentials')
  }

  const isValid = await verifyPassword(body.password, user.password)
  if (!isValid) {
    throw unauthorized('Invalid credentials')
  }

  try {
    await recordAudit(c.env.DB, {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'AdminUser',
      entityId: user.id,
    })
  } catch (err) {
    console.error('Failed to record login audit:', err)
  }

  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: jwtExpiry(c.env.JWT_EXPIRES_IN),
    },
    c.env.JWT_SECRET,
  )

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

authRoutes.get('/me', adminGuard, (c) => {
  const user = c.get('admin')!
  return c.json({ id: user.id, email: user.email, name: user.name, role: user.role })
})