import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { sql } from './db'
import { randomToken, verifyPassword } from './crypto'

const COOKIE = 'ac_session'
const SESSION_DAYS = 30

export interface SessionUser {
  id: string
  email: string
}

export async function currentUser(): Promise<SessionUser | null> {
  const id = getCookie(COOKIE)
  if (!id) return null
  const [user] = await sql()<SessionUser[]>`
    SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${id} AND s.expires_at > now()
  `
  return user ?? null
}

export async function signIn(email: string, password: string): Promise<boolean> {
  const [user] = await sql()<{ id: string; password_hash: string }[]>`
    SELECT id, password_hash FROM users WHERE email = ${email.trim().toLowerCase()}
  `
  if (!user || !(await verifyPassword(password, user.password_hash))) return false
  const id = randomToken()
  await sql()`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${id}, ${user.id}, now() + make_interval(days => ${SESSION_DAYS}))
  `
  setCookie(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return true
}

export async function signOut(): Promise<void> {
  const id = getCookie(COOKIE)
  if (id) await sql()`DELETE FROM sessions WHERE id = ${id}`
  deleteCookie(COOKIE, { path: '/' })
}
