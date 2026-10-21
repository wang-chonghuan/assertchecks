import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { currentUser, lastProject, rememberProject } from './session'
import { bugReport, caseDetail, checkDetail, me, overview } from './queries'
import { decideProblem as decide, productionErrors, type Decision } from './production-errors'

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

// Read only when the Production errors tab is open: it queries the project's telemetry.
export const getProductionErrors = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => found(await productionErrors((await requireUser()).id, data.project)))

// A ticket link is any http(s) URL; the reason for not handling is one short line.
function decision(data: { decision?: unknown; ticketUrl?: unknown; reason?: unknown }): Decision {
  if (data.decision === 'none') return { decision: 'none' }
  if (data.decision === 'ticket') {
    const url = text(data.ticketUrl, 'ticketUrl').trim()
    let parsed: URL
    try { parsed = new URL(url) } catch { throw new Error('ticketUrl must be a URL') }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('ticketUrl must be an http(s) URL')
    return { decision: 'ticket', ticketUrl: url }
  }
  if (data.decision === 'ignored') return { decision: 'ignored', reason: text(data.reason, 'reason').trim() }
  throw new Error('decision must be ticket, ignored or none')
}

export const decideProblem = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; problem: unknown; decision?: unknown; ticketUrl?: unknown; reason?: unknown }) => {
    const problem = text(data.problem, 'problem')
    if (!/^[1-9][0-9]{0,17}$/.test(problem)) throw new Error('problem must be an id')
    return { project: text(data.project, 'project'), problem, decision: decision(data) }
  })
  .handler(async ({ data }) => {
    if (!(await decide(await requireUser(), data.project, data.problem, data.decision))) throw notFound()
    return { ok: true }
  })
