import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { currentUser, lastProject, rememberProject } from './session'
import { bugReport, caseDetail, checkDetail, me, overview } from './queries'
import {
  decideProblem as decide, platformPeople, platformTargets, productionErrors, readProductionErrors, removeDestination,
  saveDestination, saveSlack, type AccessInput, type Decision,
} from './production-errors'
import { announce } from './auto-tickets'
import { webhookUrl } from './slack'
import { attachTicket as attach, caseIds, removeTicket as remove, ticketUrl, type Subject } from './ticket-links'
import { approveLogin, clientLogin, LOGIN_CODE } from './client-tokens'

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

// A signed-in viewer for a read: a CLI user is not required, because a project's email-domain group can
// view it read-only (ASSERT-55). Not signed in still goes to the login page.
async function requireViewer() {
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

export const getOverview = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => remembered(await overview(await requireViewer(), data.project)))

export const getCheck = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown; run?: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
    run: runNumber(data.run),
  }))
  .handler(async ({ data }) =>
    remembered(await checkDetail(await requireViewer(), data.project, data.check, data.run)))

export const getCase = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown; case: unknown; run?: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
    case: text(data.case, 'case'),
    run: runNumber(data.run),
  }))
  .handler(async ({ data }) =>
    remembered(await caseDetail(await requireViewer(), data.project, data.check, data.case, data.run)))

// Fetched only when someone copies a bug report, so the check page stays light.
export const getBugReport = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown; check: unknown }) => ({
    project: text(data.project, 'project'),
    check: text(data.check, 'check'),
  }))
  .handler(async ({ data }) => found(await bugReport(await requireViewer(), data.project, data.check)))

// Read only when the Production errors tab is open: it queries the project's telemetry.
export const getProductionErrors = createServerFn({ method: 'GET' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => found(await productionErrors(await requireViewer(), data.project)))

const ID = /^[1-9][0-9]{0,17}$/

// The reason for not handling is one short line.
function decision(data: { decision?: unknown; reason?: unknown }): Decision {
  if (data.decision === 'none') return { decision: 'none' }
  if (data.decision === 'ignored') return { decision: 'ignored', reason: text(data.reason, 'reason').trim() }
  throw new Error('decision must be ignored or none')
}

export const decideProblem = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; problem: unknown; decision?: unknown; reason?: unknown }) => {
    const problem = text(data.problem, 'problem')
    if (!ID.test(problem)) throw new Error('problem must be an id')
    return { project: text(data.project, 'project'), problem, decision: decision(data) }
  })
  .handler(async ({ data }) => {
    if (!(await decide(await requireUser(), data.project, data.problem, data.decision))) throw notFound()
    return { ok: true }
  })

// One ticket onto some cases of the project, or onto one production problem.
export const attachTicket = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; ticket: unknown; cases?: unknown; problem?: unknown }) => {
    let subject: Subject
    if (data.problem !== undefined) {
      const problem = text(data.problem, 'problem')
      if (!ID.test(problem)) throw new Error('problem must be an id')
      subject = { problem }
    } else {
      subject = { cases: caseIds(data.cases) }
    }
    return { project: text(data.project, 'project'), ticket: ticketUrl(data.ticket), subject }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const attached = found(await attach(user, data.project, data.subject, data.ticket))
    // A new ticket on a production error goes to the project's Slack channel, when it has one.
    let slack: string | null = null
    if (attached.added && 'problem' in data.subject) {
      const problemId = data.subject.problem
      const problem = (await readProductionErrors(attached.project)).problems.find((item) => item.id === problemId)
      if (problem) {
        slack = await announce({
          projectId: attached.project.id, projectSlug: attached.project.slug, projectName: attached.project.name,
          ticket: data.ticket, problems: [problem], automatic: false, by: user.email,
        })
      }
    }
    return { ok: true, slack }
  })

export const removeTicket = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; link: unknown }) => {
    const link = text(data.link, 'link')
    if (!ID.test(link)) throw new Error('link must be an id')
    return { project: text(data.project, 'project'), link }
  })
  .handler(async ({ data }) => {
    if (!(await remove(await requireUser(), data.project, data.link))) throw notFound()
    return { ok: true }
  })

// Read when the project's Tests tab shows its bugs.
// The approval page for a client sign-in (ASSERT-38). Codes are shown upper-case; a typed one may not be.
const loginCodeOf = (data: { code: unknown }) => {
  const code = text(data.code, 'code').toUpperCase()
  if (!LOGIN_CODE.test(code)) throw notFound()
  return { code }
}

export const getClientLogin = createServerFn({ method: 'GET' })
  .validator(loginCodeOf)
  .handler(async ({ data }) => {
    await requireUser()
    return found(await clientLogin(data.code))
  })

export const approveClientLogin = createServerFn({ method: 'POST' })
  .validator(loginCodeOf)
  .handler(async ({ data }) => ({ approved: await approveLogin((await requireUser()).id, data.code) }))

// Automatic tickets (ASSERT-49). A key typed into the form is sent here and never sent back; an empty key
// means the saved one.
function access(data: { platform?: unknown; workspace?: unknown; token?: unknown }): AccessInput {
  if (data.platform !== 'plane' && data.platform !== 'linear') throw new Error('platform must be plane or linear')
  const token = typeof data.token === 'string' && data.token.trim() ? data.token.trim() : null
  if (token && token.length > 512) throw new Error('the access key is too long')
  let workspace: string | null = null
  if (data.platform === 'plane') {
    workspace = text(data.workspace, 'workspace').trim()
    if (!/^[\w-]{1,64}$/.test(workspace)) throw new Error('workspace must be the slug in app.plane.so/<slug>/')
  }
  return { platform: data.platform, workspace, token }
}

const named = (value: unknown, field: string): { id: string; name: string } => {
  const item = value as { id?: unknown; name?: unknown } | null
  return { id: text(item?.id, field), name: text(item?.name, field) }
}

const teamOf = (value: unknown): string | null => {
  const team = (value as { teamId?: unknown } | null)?.teamId
  return typeof team === 'string' && team ? team : null
}

export const getTicketTargets = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; platform: unknown; workspace?: unknown; token?: unknown }) =>
    ({ project: text(data.project, 'project'), access: access(data) }))
  .handler(async ({ data }) => found(await platformTargets(await requireUser(), data.project, data.access)))

export const getTicketPeople = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; platform: unknown; workspace?: unknown; token?: unknown; target: unknown }) => ({
    project: text(data.project, 'project'),
    access: access(data),
    target: { id: named(data.target, 'target').id, teamId: teamOf(data.target) },
  }))
  .handler(async ({ data }) => found(await platformPeople(await requireUser(), data.project, data.access, data.target)))

export const saveTicketDestination = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; platform: unknown; workspace?: unknown; token?: unknown; target: unknown; assignee?: unknown }) => ({
    project: text(data.project, 'project'),
    destination: {
      ...access(data),
      target: { ...named(data.target, 'target'), teamId: teamOf(data.target) },
      assignee: data.assignee ? named(data.assignee, 'assignee') : null,
    },
  }))
  .handler(async ({ data }) => {
    if (!(await saveDestination(await requireUser(), data.project, data.destination))) throw notFound()
    return { ok: true }
  })

export const removeTicketDestination = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown }) => ({ project: text(data.project, 'project') }))
  .handler(async ({ data }) => {
    if (!(await removeDestination(await requireUser(), data.project))) throw notFound()
    return { ok: true }
  })

export const saveSlackChannel = createServerFn({ method: 'POST' })
  .validator((data: { project: unknown; webhook: unknown; channel?: unknown }) => {
    const webhook = data.webhook === null ? null : webhookUrl(data.webhook)
    let channel: string | null = null
    if (webhook) {
      channel = text(data.channel, 'channel').trim().replace(/^#?/, '#')
      if (channel.length > 81) throw new Error('channel is too long')
    }
    return { project: text(data.project, 'project'), webhook, channel }
  })
  .handler(async ({ data }) => {
    if (!(await saveSlack(await requireUser(), data.project, data.webhook, data.channel))) throw notFound()
    return { ok: true }
  })
