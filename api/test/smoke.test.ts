import { describe, it, expect, beforeAll } from 'vitest'
import { BASE } from './server'

let token = ''
const auth = () => ({ Authorization: `Bearer ${token}` })

async function api(method: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: init.headers ?? {},
    ...(init.body ? { body: init.body } : {}),
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  return { status: res.status, json }
}

beforeAll(async () => {
  const { json } = await api('POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@portal.com', password: 'Admin@123' }),
  })
  token = (json as { token: string }).token
  expect(token).toBeTruthy()
})

describe('health + auth', () => {
  it('health returns ok', async () => {
    const { status, json } = await api('GET', '/api/health')
    expect(status).toBe(200)
    expect(json).toMatchObject({ status: 'ok' })
  })

  it('login returns token + user, and /me never leaks password hash', async () => {
    const me = await api('GET', '/api/auth/me', { headers: auth() })
    expect(me.status).toBe(200)
    const body = me.json as Record<string, unknown>
    expect(body.email).toBe('admin@portal.com')
    expect(body.password).toBeUndefined()
    expect('passwordHash' in body).toBe(false)
  })

  it('rejects wrong password with Nest-shaped 401', async () => {
    const { status, json } = await api('POST', '/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'wrong' }),
    })
    expect(status).toBe(401)
    expect(json).toMatchObject({ message: 'Invalid credentials', statusCode: 401 })
  })

  it('blocks admin routes without a token', async () => {
    const { status, json } = await api('GET', '/api/applications')
    expect(status).toBe(401)
    expect(json).toMatchObject({ statusCode: 401 })
  })
})

describe('read endpoints', () => {
  it('applications are ordered desc with _count', async () => {
    const { status, json } = await api('GET', '/api/applications', { headers: auth() })
    const apps = json as Array<Record<string, any>>
    expect(status).toBe(200)
    expect(apps).toHaveLength(2)
    expect(apps[0].code).toBe('HR')
    expect(apps[0]._count).toMatchObject({ emailLists: 3, credentials: 1 })
    expect(apps[1]._count).toMatchObject({ emailLists: 2, credentials: 1 })
  })

  it('recipients paginate with nested department', async () => {
    const { status, json } = await api('GET', '/api/recipients?limit=2', { headers: auth() })
    const body = json as any
    expect(status).toBe(200)
    expect(body.total).toBe(9)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(2)
    expect(body.recipients).toHaveLength(2)
    expect(body.recipients[0]).toHaveProperty('employeeCode')
    const withDept = body.recipients.find((r: any) => r.departmentId)
    if (withDept) expect(withDept.department).toHaveProperty('code')
  })

  it('recipients search filters by name/email/code', async () => {
    const { json } = await api('GET', '/api/recipients?search=finance', { headers: auth() })
    const body = json as any
    expect(body.total).toBe(1)
    expect(body.recipients[0].name).toBe('Finance Manager')
  })

  it('email-lists list has application + _count', async () => {
    const { status, json } = await api('GET', '/api/email-lists', { headers: auth() })
    const lists = json as Array<Record<string, any>>
    expect(status).toBe(200)
    expect(lists).toHaveLength(5)
    expect(lists[0].code).toBe('HR_PAYROLL')
    expect(lists[0].application.code).toBe('HR')
    expect(lists[0]._count).toMatchObject({ recipients: 2 })
  })

  it('email-list detail returns members ordered by type then priority', async () => {
    const { json } = await api('GET', '/api/email-lists', { headers: auth() })
    const lists = json as Array<Record<string, any>>
    const hrPayroll = lists.find((l) => l.code === 'HR_PAYROLL')!
    const detail = await api('GET', `/api/email-lists/${hrPayroll.id}`, { headers: auth() })
    const body = detail.json as any
    expect(detail.status).toBe(200)
    expect(body.recipients).toHaveLength(2)
    const types = body.recipients.map((m: any) => m.recipientType)
    expect(types).toEqual([...types].sort())
    expect(body.recipients[0].recipient).toHaveProperty('department')
  })

  it('credentials list never leaks apiKey', async () => {
    const { status, json } = await api('GET', '/api/credentials', { headers: auth() })
    const creds = json as Array<Record<string, any>>
    expect(status).toBe(200)
    expect(creds).toHaveLength(2)
    for (const c of creds) {
      expect(c.apiKey).toBeUndefined()
      expect(c.application.code).toBeTruthy()
    }
  })

  it('audit-logs paginate with user', async () => {
    const { status, json } = await api('GET', '/api/audit-logs?limit=5', { headers: auth() })
    const body = json as any
    expect(status).toBe(200)
    expect(body.logs.length).toBeGreaterThan(0)
    expect(body.logs[0]).toMatchObject({ action: 'LOGIN', entityType: 'AdminUser' })
    expect(body.logs[0].user.email).toBe('admin@portal.com')
  })

  it('dashboard returns counts and recent lists', async () => {
    const { status, json } = await api('GET', '/api/dashboard', { headers: auth() })
    const body = json as any
    expect(status).toBe(200)
    expect(body.counts).toMatchObject({
      applications: 2,
      emailLists: 5,
      recipients: 9,
      departments: 6,
      activeLists: 5,
      inactiveLists: 0,
      activeRecipients: 9,
      inactiveRecipients: 0,
    })
    expect(body.recentLists).toHaveLength(5)
  })
})

describe('integration endpoint', () => {
  it('resolves an allowed list with TO/CC/BCC ordering', async () => {
    const { status, json } = await api('GET', '/api/email-lists/MEDICAL/MEDICAL_CLAIM_APPROVERS', {
      headers: { 'X-API-KEY': 'erp_medical_seed_demo_001' },
    })
    const body = json as any
    expect(status).toBe(200)
    expect(body.application).toBe('MEDICAL')
    expect(body.list).toBe('MEDICAL_CLAIM_APPROVERS')
    expect(body.recipients.length).toBe(5)
    const types = body.recipients.map((r: any) => r.type)
    expect(types[0]).toBe('TO')
    expect(types[types.length - 1]).toBe('BCC')
    for (const r of body.recipients) {
      expect(r).toHaveProperty('name')
      expect(r).toHaveProperty('email')
      expect(r).toHaveProperty('type')
    }
  })

  it('rejects cross-application access with 403', async () => {
    const { status, json } = await api('GET', '/api/email-lists/MEDICAL/MEDICAL_CLAIM_APPROVERS', {
      headers: { 'X-API-KEY': 'erp_hr_seed_demo_001' },
    })
    expect(status).toBe(403)
    expect(json).toMatchObject({
      message: 'Application is not allowed to access this email list',
      statusCode: 403,
    })
  })

  it('rejects an invalid key with 401', async () => {
    const { status } = await api('GET', '/api/email-lists/MEDICAL/MEDICAL_CLAIM_APPROVERS', {
      headers: { 'X-API-KEY': 'erp_bad_key' },
    })
    expect(status).toBe(401)
  })
})

describe('writes + errors', () => {
  it('creates an application with uppercased code', async () => {
    const { status, json } = await api('POST', '/api/applications', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'qa_test', name: 'QA Test App' }),
    })
    expect(status).toBe(201)
    expect((json as any).code).toBe('QA_TEST')
  })

  it('rejects duplicate application code with 409', async () => {
    const { status, json } = await api('POST', '/api/applications', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'medical', name: 'dup' }),
    })
    expect(status).toBe(409)
    expect((json as any).message).toContain('already exists')
  })

  it('creates recipient + membership and returns 404 on unknown list', async () => {
    const rec = await api('POST', '/api/recipients', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode: 'EMP900', name: 'QA Recipient', email: 'qa@company.com' }),
    })
    expect(rec.status).toBe(201)

    const apps = await api('GET', '/api/applications', { headers: auth() })
    const qa = (apps.json as any[]).find((a: any) => a.code === 'QA_TEST')
    const list = await api('POST', '/api/email-lists', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: qa.id, code: 'QA_LIST', name: 'QA List' }),
    })
    expect(list.status).toBe(201)

    const mem = await api('POST', `/api/email-lists/${(list.json as any).id}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: (rec.json as any).id, recipientType: 'CC', priority: 2 }),
    })
    expect(mem.status).toBe(201)
    expect((mem.json as any).recipientType).toBe('CC')

    const missing = await api('POST', '/api/email-lists/does-not-exist/recipients', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: (rec.json as any).id }),
    })
    expect(missing.status).toBe(404)
  })

  it('returns Nest-shaped 404 for unknown routes', async () => {
    const { status, json } = await api('GET', '/api/does-not-exist')
    expect(status).toBe(404)
    expect(json).toMatchObject({ statusCode: 404, error: 'Not Found' })
  })
})