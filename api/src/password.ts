const ITERATIONS = 100_000
const KEY_LENGTH = 32
const encoder = new TextEncoder()

const PBKDF2_PREFIX = 'pbkdf2'

function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function b64decode(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await derive(password, salt, ITERATIONS)
  return `${PBKDF2_PREFIX}:sha256:${ITERATIONS}:${b64encode(salt)}:${b64encode(key)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 5 || parts[0] !== PBKDF2_PREFIX || parts[1] !== 'sha256') return false
  const iterations = parseInt(parts[2], 10)
  if (!Number.isFinite(iterations) || iterations < 1) return false
  try {
    const salt = b64decode(parts[3])
    const expected = b64decode(parts[4])
    const actual = await derive(password, salt, iterations)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}