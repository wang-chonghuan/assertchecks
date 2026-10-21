import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { currentUser, lastProject, rememberProject } from './session'
import { bugReport, caseDetail, checkDetail, me, overview } from './queries'

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value || value.length > 256) throw new Error(`${field} is required`)
  return value
}

// An optional run number from the history; anything else is ignored rather than guessed at.
const runNumber = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[1-9][0-9]{0,17}$/.test(value) ? value : undefined

// The operator-created user behind the signed-in email; an email without one can see no project.
async function requireUser() {
  const user = await currentUser()
  if (!user) throw redirect({ to: '/login' })
  if (!user.id) throw notFound()
  return { id: user.id, email: user.email }
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

export const getOverview = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => remembered(await overview((await requireUser()).id, data.project)))

export const getCheck = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown; run?: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
    run: runNumber(data.run),
  }))
  .handler(async ({ data }) =>
    remembered(await checkDetail((await requireUser()).id, data.project, data.check, data.run)))

export const getCase = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown; case: unknown; run?: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
    case: text(data.case, 'case'),
    run: runNumber(data.run),
  }))
  .handler(async ({ data }) =>
    remembered(await caseDetail((await requireUser()).id, data.project, data.check, data.case, data.run)))

// Fetched only when someone copies a bug report, so the check page stays light.
export const getBugReport = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
  }))
  .handler(async ({ data }) => found(await bugReport((await requireUser()).id, data.project, data.check)))
