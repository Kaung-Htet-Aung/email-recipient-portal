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
    const order = ['TO', 'CC', 'BCC']
    const types = body.recipients.map((m: any) => m.recipientType)
    expect(types.every((t) => order.includes(t))).toBe(true)
    const positions = types.map((t) => order.indexOf(t))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
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
      expect(r).toHaveProperty('role')
      expect(r).toHaveProperty('priority')
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

describe('mail-list memberships (role + placement)', () => {
  async function createRecipient(code: string, name: string, email: string) {
    const res = await api('POST', '/api/recipients', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode: code, name, email }),
    })
    expect(res.status).toBe(201)
    return (res.json as any).id
  }

  it('adds with role + placement, reorders via edit, and rejects bad placement', async () => {
    const apps = await api('GET', '/api/applications', { headers: auth() })
    const app = (apps.json as any[])[0]
    const list = await api('POST', '/api/email-lists', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id, code: 'ROLE_TEST', name: 'Role Test List' }),
    })
    expect(list.status).toBe(201)
    const listId = (list.json as any).id

    const aId = await createRecipient('ROLEA', 'Role A', 'rolea@company.com')
    const bId = await createRecipient('ROLEB', 'Role B', 'roleb@company.com')
    const cId = await createRecipient('ROLEC', 'Role C', 'rolec@company.com')
    const dId = await createRecipient('ROLED', 'Role D', 'roled@company.com')

    const mA = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: aId }),
    })
    expect(mA.status).toBe(201)
    const mAId = (mA.json as any).id

    const mB = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: bId, afterRecipientId: mAId }),
    })
    expect(mB.status).toBe(201)
    expect((mB.json as any).priority).toBe(1)
    const mBId = (mB.json as any).id

    const mC = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: cId, beforeRecipientId: mAId, role: 'REVIEWER' }),
    })
    expect(mC.status).toBe(201)
    expect((mC.json as any).role).toBe('REVIEWER')
    const mCId = (mC.json as any).id

    const detail1 = await api('GET', `/api/email-lists/${listId}`, { headers: auth() })
    expect(detail1.status).toBe(200)
    const members1 = (detail1.json as any).recipients
    expect(members1.map((m: any) => m.recipient.employeeCode)).toEqual(['ROLEC', 'ROLEA', 'ROLEB'])
    expect(members1[0].role).toBe('REVIEWER')
    expect(members1.map((m: any) => m.priority)).toEqual([0, 1, 2])

    const moveA = await api('PATCH', `/api/email-lists/${listId}/recipients/${aId}`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ beforeRecipientId: mCId, role: 'APPROVER' }),
    })
    expect(moveA.status).toBe(200)
    expect((moveA.json as any).role).toBe('APPROVER')

    const detail2 = await api('GET', `/api/email-lists/${listId}`, { headers: auth() })
    const members2 = (detail2.json as any).recipients
    expect(members2.map((m: any) => m.recipient.employeeCode)).toEqual(['ROLEA', 'ROLEC', 'ROLEB'])
    expect(members2.map((m: any) => m.priority)).toEqual([0, 1, 2])
    expect(members2[0].role).toBe('APPROVER')

    const selfPos = await api('PATCH', `/api/email-lists/${listId}/recipients/${bId}`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ beforeRecipientId: mBId }),
    })
    expect(selfPos.status).toBe(400)
    expect((selfPos.json as any).message).toContain('relative to itself')

    const both = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: dId,
        beforeRecipientId: mAId,
        afterRecipientId: mBId,
      }),
    })
    expect(both.status).toBe(400)
    expect((both.json as any).message).toContain('cannot both be set')

    const unknownAnchor = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: dId, beforeRecipientId: '99999999-9999-4999-8999-999999999999' }),
    })
    expect(unknownAnchor.status).toBe(404)
  })

  it('deletes a membership', async () => {
    const apps = await api('GET', '/api/applications', { headers: auth() })
    const app = (apps.json as any[])[0]
    const list = await api('POST', '/api/email-lists', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id, code: 'DEL_MEMBER', name: 'Delete Member List' }),
    })
    expect(list.status).toBe(201)
    const listId = (list.json as any).id
    const rid = await createRecipient('DELEMB', 'Delete Member', 'delemb@company.com')

    const mem = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: rid, role: 'OBSERVER' }),
    })
    expect(mem.status).toBe(201)

    const del = await api('DELETE', `/api/email-lists/${listId}/recipients/${rid}`, { headers: auth() })
    expect(del.status).toBe(200)
    expect((del.json as any).role).toBe('OBSERVER')
  })
})

describe('department delete + unassign', () => {
  it('deletes a department and unassigns its recipients (SET NULL)', async () => {
    const dept = await api('POST', '/api/departments', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'QA_DEPT', name: 'QA Department', description: 'temp' }),
    })
    expect(dept.status).toBe(201)
    const deptId = (dept.json as any).id

    const rec = await api('POST', '/api/recipients', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode: 'DEPQA',
        name: 'Dept QA',
        email: 'deptqa@company.com',
        departmentId: deptId,
      }),
    })
    expect(rec.status).toBe(201)
    const recId = (rec.json as any).id
    expect((rec.json as any).departmentId).toBe(deptId)

    const del = await api('DELETE', `/api/departments/${deptId}`, { headers: auth() })
    expect(del.status).toBe(200)
    expect((del.json as any).code).toBe('QA_DEPT')

    const gone = await api('GET', `/api/departments/${deptId}`, { headers: auth() })
    expect(gone.status).toBe(404)

    const recAfter = await api('GET', `/api/recipients/${recId}`, { headers: auth() })
    expect(recAfter.status).toBe(200)
    expect((recAfter.json as any).departmentId).toBeNull()
    expect((recAfter.json as any).department).toBeNull()
  })

  it('returns 404 when deleting an unknown department', async () => {
    const { status } = await api('DELETE', '/api/departments/does-not-exist', { headers: auth() })
    expect(status).toBe(404)
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

  it('deletes a recipient and cascades memberships', async () => {
    const rec = await api('POST', '/api/recipients', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode: 'DEL001', name: 'Delete Me', email: 'del@company.com' }),
    })
    expect(rec.status).toBe(201)
    const recId = (rec.json as any).id

    const apps = await api('GET', '/api/applications', { headers: auth() })
    const app = (apps.json as any[])[0]
    const list = await api('POST', '/api/email-lists', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id, code: 'DEL_TEST_LIST', name: 'Delete Test List' }),
    })
    expect(list.status).toBe(201)
    const listId = (list.json as any).id

    const mem = await api('POST', `/api/email-lists/${listId}/recipients`, {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: recId }),
    })
    expect(mem.status).toBe(201)

    const del = await api('DELETE', `/api/recipients/${recId}`, { headers: auth() })
    expect(del.status).toBe(200)
    expect((del.json as any).employeeCode).toBe('DEL001')

    const gone = await api('GET', `/api/recipients/${recId}`, { headers: auth() })
    expect(gone.status).toBe(404)

    const listAfter = await api('GET', `/api/email-lists/${listId}`, { headers: auth() })
    expect((listAfter.json as any).recipients).toHaveLength(0)

    await api('DELETE', `/api/email-lists/${listId}`, { headers: auth() })
  })

  it('deletes an email list', async () => {
    const apps = await api('GET', '/api/applications', { headers: auth() })
    const app = (apps.json as any[])[0]
    const list = await api('POST', '/api/email-lists', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id, code: 'DEL_ONLY', name: 'Delete Only List' }),
    })
    expect(list.status).toBe(201)
    const listId = (list.json as any).id

    const del = await api('DELETE', `/api/email-lists/${listId}`, { headers: auth() })
    expect(del.status).toBe(200)
    expect((del.json as any).code).toBe('DEL_ONLY')

    const gone = await api('GET', `/api/email-lists/${listId}`, { headers: auth() })
    expect(gone.status).toBe(404)
  })

  it('returns 404 when deleting unknown recipient', async () => {
    const { status } = await api('DELETE', '/api/recipients/does-not-exist', { headers: auth() })
    expect(status).toBe(404)
  })

  it('returns 404 when deleting unknown email list', async () => {
    const { status } = await api('DELETE', '/api/email-lists/does-not-exist', { headers: auth() })
    expect(status).toBe(404)
  })
})