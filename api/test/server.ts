import { spawn, execFileSync, ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

export const TEST_PORT = 8788
export const BASE = `http://127.0.0.1:${TEST_PORT}`

const dist = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(dist, '..')
const persistDir = path.join(apiRoot, '.wrangler-test')
const wranglerBin = path.join(apiRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

let server: ChildProcess | null = null

export async function startServer() {
  fs.rmSync(persistDir, { recursive: true, force: true })

  execFileSync(process.execPath, [
    wranglerBin,
    'd1',
    'execute',
    'email-recipient-db',
    '--local',
    '--persist-to',
    persistDir,
    '--file',
    path.join(apiRoot, 'schema.sql'),
  ])
  execFileSync(process.execPath, [
    wranglerBin,
    'd1',
    'execute',
    'email-recipient-db',
    '--local',
    '--persist-to',
    persistDir,
    '--file',
    path.join(apiRoot, 'seed.sql'),
  ])

  server = spawn(
    process.execPath,
    [wranglerBin, 'dev', '--port', String(TEST_PORT), '--persist-to', persistDir],
    { cwd: apiRoot, stdio: ['ignore', 'ignore', 'inherit'] },
  )

  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return
    } catch {
      // wait longer
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('wrangler dev did not become ready on port 8788')
}

export function stopServer() {
  if (!server) return
  try {
    execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    server.kill()
  }
  server = null
}