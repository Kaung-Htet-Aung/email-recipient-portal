import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { AppEnv } from './types'
import { toErrorBody } from './errors'
import { hashPassword } from './password'
import { authRoutes } from './routes/auth'
import { applicationRoutes } from './routes/applications'
import { departmentRoutes } from './routes/departments'
import { recipientRoutes } from './routes/recipients'
import { emailListRoutes } from './routes/email-lists'
import { integrationRoutes } from './routes/integration'
import { credentialRoutes } from './routes/credentials'
import { auditRoutes } from './routes/audit'
import { dashboardRoutes } from './routes/dashboard'
import { now, uuid } from './db'

const app = new Hono<{ Bindings: AppEnv['Bindings']; Variables: AppEnv['Variables'] }>()

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.FRONTEND_URL || 'http://localhost:3000'
      if (!origin) return allowed
      const stripTrailingDot = (u: string) => u.replace(/\.$/, '')
      return stripTrailingDot(origin) === stripTrailingDot(allowed) ? origin : null
    },
    credentials: true,
  }),
)

app.onError((err, c) => {
  const body = toErrorBody(err)
  if (body.statusCode === 500) {
    console.error('[error]', c.req.path, err)
  }
  return c.json(body, body.statusCode as 400 | 401 | 403 | 404 | 409 | 500)
})

app.notFound((c) => {
  return c.json(
    {
      message: `Cannot ${c.req.method} ${c.req.path}`,
      error: 'Not Found',
      statusCode: 404,
    },
    404,
  )
})

async function seedAdminIfNeeded(c: { env: AppEnv['Bindings'] }) {
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS c FROM admin_users').first<{ c: number }>()
  if ((count?.c ?? 0) > 0) return

  const email = c.env.ADMIN_EMAIL || 'admin@portal.com'
  const password = c.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123'
  const hash = await hashPassword(password)
  const ts = now()
  await c.env.DB.prepare(
    `INSERT INTO admin_users (id, email, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?)`,
  )
    .bind(uuid(), email, 'Administrator', hash, ts, ts)
    .run()
  console.log(`[seed] default admin created: ${email}`)
}

let seeded = false
app.use('*', async (c, next) => {
  if (!seeded) {
    seeded = true
    try {
      await seedAdminIfNeeded(c)
    } catch (err) {
      seeded = false
      console.error('Failed to seed default admin:', err)
    }
  }
  await next()
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'email-recipient-api' })
})

app.route('/api/auth', authRoutes)
app.route('/api/applications', applicationRoutes)
app.route('/api/departments', departmentRoutes)
app.route('/api/recipients', recipientRoutes)
app.route('/api/email-lists', emailListRoutes)
app.route('/api/email-lists', integrationRoutes)
app.route('/api/credentials', credentialRoutes)
app.route('/api/audit-logs', auditRoutes)
app.route('/api/dashboard', dashboardRoutes)

export default app