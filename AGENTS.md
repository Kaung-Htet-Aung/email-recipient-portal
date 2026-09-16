# AGENTS.md

Centralized Email Recipient Management Portal. `backend/` (NestJS 12 + Prisma + MySQL 8) and `frontend/` (Next.js 16 + Tailwind v4 + shadcn-style UI), orchestrated by root `docker-compose.yml`. Not a monorepo/no workspace — run package scripts inside each folder.

## Hard business rule
NOT an email-sending or approval system. It only centrally manages applications, departments, recipients, email lists and credentials, and exposes a read-only recipient API for external apps. Never add SMTP/sending/approval features.

## Business flow (step by step)
The portal is configuration-only; the recipient-retrieval loop ends at "external app gets data":
1. **Admin registers the app and org structure.** Create `Application` (e.g. MEDICAL) and `Department`s. Toggling an application/department to INACTIVE stops it being usable.
2. **Admin registers recipients.** Create `EmailRecipient` (employee code, name, email, department). Only ACTIVE recipients are ever returned.
3. **Admin builds email lists.** Create `EmailList` under an application (unique code per application, e.g. `MEDICAL_CLAIM_APPROVERS`) and assign recipients via `EmailListRecipient` with a type (`TO`/`CC`/`BCC`) and numeric `priority` (lower = earlier). A list owner who is INACTIVE is never resolved.
4. **Admin issues API key per app.** `ApplicationCredential` (`erp_*` key) is scoped to exactly one application; REVOKE/regenerate renders old keys unusable.
5. **External app calls the integration endpoint** `GET /api/email-lists/:applicationCode/:listCode` with `X-API-KEY` (or `Authorization: Bearer <key>`).
6. **Backend authenticates + isolates.** `AppGuard` resolves the credential to its application; `getIntegrationList` throws 403 if the path's applicationCode does not match the credential's app. Then `getByApplicationAndCode` returns 404 for unknown or INACTIVE lists.
7. **Backend resolves members.** Memberships ordered by `recipientType` then `priority`; INACTIVE recipients filtered out; response is `{ application, list, recipients: [{ name, email, type }] }`.
8. **External app consumes recipients** in its own logic (sending, triaging). The portal never sends, approves, or tracks anything beyond the admin audit log (`audit_logs` records every admin change/login).

## Backend (NestJS) — quirks; do not "modernize"
- Deliberately **CommonJS**: `backend/package.json` has no `"type": "module"`; tsconfig is `module: "commonjs"`, `moduleResolution: "node"`, `ignoreDeprecations: "6.0"`. Source imports are extensionless (no `.js`). Re-enabling ESM or adding extensions breaks the build.
- `npm run lint` = **oxlint** (not eslint). Tests = vitest (`npm run test`). Build = `npm run build`.
- **Prisma pinned to 5.22.0** (`@prisma/client`, `prisma`). Plain `npx prisma init` fails here (`(0 , CSe.isError) is not a function`); newer Prisma needs unresolvable `effect@^4.0.0-rc.114`. Always `npx prisma@5.22.0 ...`. Migrations live in `backend/prisma/migrations/`.
- `AuthModule` is `@Global()` and re-exports `PassportModule`, `JwtModule`, guards, `AuthService`. This is required: the guards are instantiated inside each feature module via `@UseGuards(...)`, and without the global re-export Nest throws "can't resolve AuthModuleOptions". Keep it global.
- Default admin is created on boot by `AdminSeederService` from `ADMIN_EMAIL` / `ADMIN_DEFAULT_PASSWORD` env (defaults `admin@portal.com` / `Admin@123`).

## Prisma schema / seed facts
- Tables are snake_case via `@@map` (`application_credentials`, `email_list_recipients`, ...) though Prisma models are PascalCase. **Columns keep Prisma camelCase names** (e.g. `applicationId`, `emailListId`) — MySQL queries must quote them with backticks (`` `applicationId` ``), since unquoted identifiers are lowercased.
- `backend/prisma/seed.ts` upserts 2 apps (MEDICAL, HR), 6 departments, 9 recipients, 5 lists, 12 memberships, credentials — safe to re-run. **Docker does not run it automatically**; run `npm run prisma:seed` or `docker compose exec backend npx tsx prisma/seed.ts`.
- Seeded API keys are random and never logged. Get one via the UI (Applications → Credentials → Generate; shown once) or SELECT it from the DB.

## Docker / local-dev gotchas
- **DB is MySQL 8.** docker-compose publishes mysql on host **33061** (3306 on the host may be owned by a locally-installed MySQL — do not bind 3306); `backend/.env` DATABASE_URL points to `localhost:33061`.
- Prisma `migrate dev` creates a **shadow database** — the `portal` MySQL user has `ALL PRIVILEGES ON *.*` granted already. If it's ever lost, re-grant: `GRANT ALL PRIVILEGES ON *.* TO 'portal'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;`.
- Backend image is `node:20-slim` on purpose — Prisma's schema engine cannot load OpenSSL libs on Alpine (`Could not parse schema engine response`).
- Backend Dockerfile must run `npx prisma generate` **before** `npm run build` (compiled code imports generated Prisma types like `AdminUser`, `RecipientType`, `Status`).
- `npm install` inside images is flaky here (ECONNRESET) — Dockerfiles pass fetch retries. Windows host `node_modules` must never reach images; `.dockerignore` in both folders, keep them.
- Docker Desktop: `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe` (start it when `docker` reports the engine is down).
- PowerShell: nested double quotes get mangled when passed to `docker compose exec mysql mysql` — pipe SQL via stdin or a temp file instead.

## Frontend (Next.js 16)
- `frontend/AGENTS.md` is auto-recreated by `next dev` and authoritative: Next 16 has breaking changes; read `frontend/node_modules/next/dist/docs/` before writing Next code. Commit that file rather than deleting it.
- Alias `@/*` → `./src/*`. API client (`src/lib/api-client.ts`) appends the global `/api` prefix and targets `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`); JWT lives in localStorage keys `erp_token`/`erp_user` (see `src/lib/auth.ts`, zustand).
- React Hook Form: use `useWatch({ control, name })`, not `form.watch(...)` — the latter trips eslint `react-hooks/incompatible-library` under the React Compiler.
- Zod validation schemas: `src/validations/index.ts`. API calls: `src/services/*`.

## Commands
```
# first-time DB setup (from backend/)
docker compose up -d mysql
npx prisma@5.22.0 migrate dev --name init
npm run prisma:seed

# full stack
docker compose up -d --build

# local dev
cd backend && npm run start:dev     # http://localhost:3001, Swagger /api/docs
cd frontend && npm run dev          # http://localhost:3000, login admin@portal.com / Admin@123
```

## API surface
- Admin APIs: global `/api` prefix, JWT via `Authorization: Bearer <token>`. Swagger: `http://localhost:3001/api/docs`.
- App integration: `GET /api/email-lists/:applicationCode/:listCode` with `X-API-KEY: <key>` (or `Authorization: Bearer <key>`). `AppGuard` enforces app isolation — a key for app X requested against app Y's list returns 403. Keep this path separate from the admin JWT path.

## Workers API (`api/`) — in-progress migration
The `backend/` NestJS API is being replaced by `api/`: a **Hono + Cloudflare Workers + D1 (SQLite)** worker with full admin parity. `backend/` stays as reference; do not modernize it.
- `api/` is standalone (`type: module`), deps: `hono`, `zod`. Dev scripts: `npm run dev` (wrangler, port 8787), `npm test` (vitest, spawns its own server), `npm run db:setup` / `db:reset` (local D1).
- Schema/seed: `api/schema.sql` + `api/seed.sql` (NOT auto-run by Docker; run `db:setup`). Local D1 state lives in `api/.wrangler/` (gitignored). Seeded admin `admin@portal.com` / `Admin@123`; integration keys `erp_medical_seed_demo_001`, `erp_hr_seed_demo_001`.
- Env: `api/.dev.vars` provides `JWT_SECRET`/`FRONTEND_URL` locally (gitignored; template `.dev.vars.example`). Deployed worker needs `wrangler secret put JWT_SECRET`.
- Parity rules (deviate only with reason): Nest-shaped errors `{ message, error, statusCode }`, camelCase + ISO timestamps + `_count`, pagination `{ total, page, limit }`, codes uppercased, `apiKey` only returned from generate/regenerate, `auth/me` never leaks the password hash, membership order = recipientType (TO/CC/BCC) then priority.
- SQLite quirks to preserve: `UNIQUE ... COLLATE NOCASE` on `applications.code`/`departments.code` so dupe lookups are case-insensitive like MySQL.
- Guards are per-route (not router-wide) because admin and integration share the `/api/email-lists` prefix — a router-wide `use()` would block the integration path.
- Passwords are PBKDF2-SHA256 (100k iters, Web Crypto, `src/password.ts`) — Nest uses bcrypt, but bcryptjs pure-JS blows the free Workers CPU cap and login would 500. Stored as `pbkdf2:sha256:...` in `admin_users.password`.

## Frontend
- Point the app at the worker in local dev with `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8787` (gitignored).