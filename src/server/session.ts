import { getCookie, setCookie } from '@tanstack/react-start/server'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { sql } from './db'

const PROJECT_COOKIE = 'ac_project'

// Clerk proves who is signed in; access comes only from the operator-created user with that email and
// its memberships. An email the CLI never added signs in but has no user, so it sees no projects.
export interface SessionUser {
  id: string | null
  email: string
}

// Clerk user ID -> verified primary email. The users table is still read on every request, so access
// changes apply at once; the cache only saves a Clerk API call.
const emails = new Map<string, string>()

async function verifiedEmail(clerkUserId: string): Promise<string> {
  const cached = emails.get(clerkUserId)
  if (cached) return cached
  const primary = (await clerkClient().users.getUser(clerkUserId)).primaryEmailAddress
  // The Clerk application signs in by email code or Google, both of which verify the email first.
  if (primary?.verification?.status !== 'verified') throw new Error(`Clerk user ${clerkUserId} has no verified primary email`)
  const email = primary.emailAddress.toLowerCase()
  emails.set(clerkUserId, email)
  return email
}

export async function currentUser(): Promise<SessionUser | null> {
  const { userId } = await auth()
  if (!userId) return null
  const email = await verifiedEmail(userId)
  const [user] = await sql()<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`
  return { id: user?.id ?? null, email }
}

// The last project the user opened; only a hint, always re-checked against memberships.
export function rememberProject(slug: string): void {
  setCookie(PROJECT_COOKIE, slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  })
}

export function lastProject(): string | null {
  return getCookie(PROJECT_COOKIE) ?? null
}
