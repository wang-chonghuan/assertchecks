import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { currentUser, lastProject, rememberProject, signIn, signOut } from './session'
import { caseDetail, checkDetail, me, overview } from './queries'

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value || value.length > 256) throw new Error(`${field} is required`)
  return value
}

async function requireUser() {
  const user = await currentUser()
  if (!user) throw redirect({ to: '/login' })
  return user
}

function found<T>(value: T | null): T {
  if (value === null) throw notFound()
  return value
}

// Opening any page of a project the user can see makes it the default after sign-in.
function remembered<T extends { project: { slug: string } }>(value: T | null): T {
  const result = found(value)
  rememberProject(result.project.slug)
  return result
}

export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await currentUser()
  return user ? me(user, lastProject()) : null
})

export const login = createServerFn({ method: 'POST' })
  .validator((data: { email: unknown; password: unknown }) => ({
    email: text(data.email, 'email'),
    password: text(data.password, 'password'),
  }))
  .handler(async ({ data }) => ({ ok: await signIn(data.email, data.password) }))

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  await signOut()
  return { ok: true }
})

export const getOverview = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => remembered(await overview((await requireUser()).id, data.project)))

export const getCheck = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
  }))
  .handler(async ({ data }) => remembered(await checkDetail((await requireUser()).id, data.project, data.check)))

export const getCase = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown; case: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
    case: text(data.case, 'case'),
  }))
  .handler(async ({ data }) =>
    remembered(await caseDetail((await requireUser()).id, data.project, data.check, data.case)))
