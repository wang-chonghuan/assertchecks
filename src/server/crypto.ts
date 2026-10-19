import { createHash, randomBytes } from 'node:crypto'

export function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

// Ping tokens are high-entropy, so a plain SHA-256 is a sufficient lookup hash.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
