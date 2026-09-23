-- Email Recipient Portal - D1 (SQLite) schema
-- Mirrors the NestJS/Prisma model. Timestamps are ISO-8601 UTC strings (Prisma
-- serializes DATETIME as ISO strings, so the frontend keeps working).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'VIEWER')),
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_recipients (
  id            TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_lists (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  code           TEXT NOT NULL COLLATE NOCASE,
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (application_id, code)
);

CREATE TABLE IF NOT EXISTS email_list_recipients (
  id             TEXT PRIMARY KEY,
  email_list_id  TEXT NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  recipient_id   TEXT NOT NULL REFERENCES email_recipients(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'TO' CHECK (recipient_type IN ('TO', 'CC', 'BCC')),
  priority       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (email_list_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS application_credentials (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  api_key        TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  old_value   TEXT,
  new_value   TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_department ON email_recipients(department_id);
CREATE INDEX IF NOT EXISTS idx_email_lists_application ON email_lists(application_id);
CREATE INDEX IF NOT EXISTS idx_email_list_recipients_list ON email_list_recipients(email_list_id);
CREATE INDEX IF NOT EXISTS idx_email_list_recipients_recipient ON email_list_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_application_credentials_application ON application_credentials(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);