// The client signed in as a person (ASSERT-38). The client makes a random token and sends only its hash;
// the person approves the request's code in the browser, which binds the token to them. From then on the
// client acts as that person through the same memberships as the pages. Check ping tokens stay for runs.
import { randomBytes } from 'node:crypto'
import { sql } from './db'
import { hashToken } from './crypto'
import type { ClientLogin } from '../lib/types'

// A sign-in nobody approved within this time is void.
export const LOGIN_MINUTES = 10

// No look-alike characters; 32 symbols divide a byte evenly, so every symbol is equally likely.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const LOGIN_CODE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

export function loginCode(bytes: Uint8Array = randomBytes(8)): string {
  const chars = [...bytes.slice(0, 8)].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4)}`
}

// The address people open. Behind the hosting ingress the request itself arrives over plain http.
export function publicOrigin(request: Request): string {
  const url = new URL(request.url)
  const first = (name: string) => request.headers.get(name)?.split(',')[0].trim() || null
  return `${first('x-forwarded-proto') ?? url.protocol.slice(0, -1)}://${first('x-forwarded-host') ?? url.host}`
}

export const approvalUrl = (request: Request, code: string) => `${publicOrigin(request)}/cli/${code}`

// A new sign-in waiting for approval. Expired ones are cleared on the way.
export async function startLogin(tokenHash: unknown): Promise<string> {
  if (typeof tokenHash !== 'string' || !/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error('tokenHash must be a SHA-256 hex digest')
  await sql()`DELETE FROM client_tokens WHERE user_id IS NULL AND created_at < now() - make_interval(mins => ${LOGIN_MINUTES})`
  const [row] = await sql()<{ code: string }[]>`
    INSERT INTO client_tokens (token_hash, code) VALUES (${tokenHash}, ${loginCode()}) RETURNING code
  `
  return row.code
}

function bearer(request: Request): string | null {
  return /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? null
}

export type ClientSession = { user: { id: string; email: string } } | { waiting: string } | null

// The person a request's token belongs to; `waiting` is the code of a sign-in not approved yet.
export async function clientSession(request: Request): Promise<ClientSession> {
  const token = bearer(request)
  if (!token) return null
  const [row] = await sql()<{ code: string; user_id: string | null; email: string | null; fresh: boolean }[]>`
    SELECT t.code, t.user_id, u.email, t.created_at > now() - make_interval(mins => ${LOGIN_MINUTES}) AS fresh
    FROM client_tokens t LEFT JOIN users u ON u.id = t.user_id WHERE t.token_hash = ${hashToken(token)}
  `
  if (!row) return null
  if (row.user_id && row.email) return { user: { id: row.user_id, email: row.email } }
  return row.fresh ? { waiting: row.code } : null
}

// The signed-in person, or the 401 reply that says why there is none.
export async function requirePerson(request: Request): Promise<{ id: string; email: string } | Response> {
  const session = await clientSession(request)
  if (session && 'user' in session) return session.user
  return Response.json(session
    ? { error: 'sign-in is waiting for approval', url: approvalUrl(request, session.waiting) }
    : { error: 'not signed in' }, { status: 401 })
}

export async function endSession(request: Request): Promise<void> {
  const token = bearer(request)
  if (token) await sql()`DELETE FROM client_tokens WHERE token_hash = ${hashToken(token)}`
}

// A sign-in request as the approval page shows it.
export async function clientLogin(code: string): Promise<ClientLogin | null> {
  const [row] = await sql()<{ code: string; created_at: Date; user_id: string | null; fresh: boolean }[]>`
    SELECT code, created_at, user_id, created_at > now() - make_interval(mins => ${LOGIN_MINUTES}) AS fresh
    FROM client_tokens WHERE code = ${code}
  `
  if (!row) return null
  return { code: row.code, requestedAt: row.created_at.toISOString(), state: row.user_id ? 'approved' : row.fresh ? 'waiting' : 'expired' }
}

// Binds a waiting sign-in to the person approving it. False when it expired or was already approved.
export async function approveLogin(userId: string, code: string): Promise<boolean> {
  const rows = await sql()`
    UPDATE client_tokens SET user_id = ${userId}, approved_at = now()
    WHERE code = ${code} AND user_id IS NULL AND created_at > now() - make_interval(mins => ${LOGIN_MINUTES})
    RETURNING id
  `
  return rows.length === 1
}
