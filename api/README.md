# Email Recipient API (Cloudflare Workers + D1)

Hono worker that replaces the legacy NestJS backend (`backend/`, kept as reference)
with full admin parity on Cloudflare Workers + D1 (SQLite).

## Setup

```txt
npm install
npm run db:setup     # creates schema + seed data in the local D1 database
npm run dev          # http://localhost:8787
```

First-time devs need a `JWT_SECRET` (and optionally `FRONTEND_URL`) — create
`.dev.vars` from the template in `.dev.vars.example`, or just let the checked-in
`.dev.vars` defaults win locally.

## Deploy

```txt
wrangler d1 migrations apply email-recipient-db --remote   # or: execute schema.sql + seed.sql with --remote
wrangler secret put JWT_SECRET                            # required on deployed worker
npm run deploy
```

## Local dev

- API base: `http://localhost:8787` — every admin route is under `/api` exactly like Nest.
- Set `NEXT_PUBLIC_API_URL=http://localhost:8787` in `frontend/.env.local` to point the frontend at the worker.
- Login: `admin@portal.com` / `Admin@123` (seeded).
- Integration keys: `erp_medical_seed_demo_001` (MEDICAL), `erp_hr_seed_demo_001` (HR).

## Scripts

| script | purpose |
|---|---|
| `dev` | `wrangler dev` (local D1 + `.dev.vars`) |
| `deploy` | `wrangler deploy --minify` |
| `db:setup` | apply `schema.sql` + `seed.sql` to the local D1 database |
| `db:reset` | delete local `.wrangler` state, then re-run `db:setup` |
| `cf-typegen` | regenerate worker types from `wrangler.jsonc` |
| `test` | vitest smoke tests (spawn `wrangler dev` on port 8788) |

## Notes / parity

- Not an email-sending or approval system — read-only recipient resolution only, exactly like Nest.
- Response JSON mirrors Prisma/Nest shapes: camelCase, ISO-8601 UTC timestamps, `_count`, pagination `{ total, page, limit }`, errors `{ message, error, statusCode }`.
- `apiKey` is only ever returned from generate/regenerate; list/get never leak it. Admin `/auth/me` omits the password hash.
- Integration endpoint `GET /api/email-lists/:applicationCode/:listCode` uses `X-API-KEY` (or `Authorization: Bearer <key>`); `AppGuard` enforces application isolation (mismatch = 403, bad key = 401), INACTIVE lists = 404, only ACTIVE recipients returned, ordered by recipient type (TO/CC/BCC) then priority.
- bcrypt parity note: NestJS uses bcrypt (10 rounds) for admin passwords. This worker uses **PBKDF2-SHA256 (100k iterations) via Web Crypto** instead — bcryptjs is pure-JS and blows the free Workers plan's 10ms CPU cap (login 500s). `verifyPassword`/`hashPassword` live in `src/password.ts`; stored format `pbkdf2:sha256:<iterations>:<saltB64>:<hashB64>`.