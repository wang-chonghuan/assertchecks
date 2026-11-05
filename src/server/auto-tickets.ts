// Automatic tickets for production errors (ASSERT-49). For a project with a ticket destination, every
// error problem in Needs a ticket gets one ticket: AssertChecks claims the problem, writes an automatic
// interpretation, files the ticket on the project's platform, attaches it, and posts it to Slack.
import { sql } from './db'
import { automationOf, readProductionErrors } from './production-errors'
import { createTicket, verify } from './ticket-platforms'
import { interpret, type ErrorFacts, type Language } from './interpret'
import { postToSlack } from './slack'
import { problemLink, slackText, ticketText } from './ticket-text'
import { ORIGIN } from '../lib/connect-guide'
import type { ProblemView } from '../lib/types'

// Who automatic tickets are attached by, as the page shows it.
export const AUTOMATIC = 'AssertChecks (automatic)'

export interface RunSummary { project: string; filed: string[]; failed: { problem: string; error: string }[]; skipped?: string }

const facts = (problem: ProblemView): ErrorFacts => ({
  key: problem.key,
  type: problem.latest?.type ?? null,
  message: problem.latest?.message ?? problem.key,
  place: problem.place,
  source: problem.browser ? 'browser' : (problem.role ?? 'server'),
  firstSeen: problem.firstSeen,
  lastSeen: problem.lastSeen,
  count24h: problem.count24h,
  count7d: problem.count7d,
  count90d: problem.count90d,
  variants: problem.variants.map(({ template, count }) => ({ template, count })),
  stack: problem.latest?.stack ?? null,
})

// Takes the problem for this run. A problem is taken once; one whose ticket failed is taken again after the
// settings changed, so an unchanged mistake does not fail every ten minutes, or on the next run when only
// the interpretation failed (stored with the earliest config_at), since that is usually passing.
async function claim(problemId: string, configAt: Date): Promise<boolean> {
  const rows = await sql()`
    INSERT INTO auto_tickets (problem_id, state, config_at) VALUES (${problemId}, 'creating', ${configAt})
    ON CONFLICT (problem_id) DO UPDATE SET state = 'creating', error = null, url = null, config_at = EXCLUDED.config_at, updated_at = now()
    WHERE auto_tickets.state = 'failed' AND auto_tickets.config_at < EXCLUDED.config_at
    RETURNING problem_id
  `
  return rows.length === 1
}

// Posts a ticket put on a project's problems to its Slack channel, if it has one. Returns why it could
// not, so the person or the run can see it; never throws.
export async function announce(input: {
  projectId: string
  projectSlug: string
  projectName: string
  ticket: string
  problems: ProblemView[]
  automatic: boolean
  by: string
}): Promise<string | null> {
  const automation = await automationOf(input.projectId)
  if (!automation?.slack_webhook) return null
  const errors = input.problems.filter((problem) => problem.kind === 'error')
  if (!errors.length) return null
  try {
    await postToSlack(automation.slack_webhook, slackText({
      project: input.projectName,
      ticket: input.ticket,
      problems: errors.map((problem) => ({ problem, link: problemLink(ORIGIN, input.projectSlug, problem.id) })),
      automatic: input.automatic,
      by: input.by,
    }))
    return null
  } catch (error) {
    return (error as Error).message
  }
}

export async function fileAutomaticTickets(projectId: string): Promise<RunSummary> {
  const [found] = await sql()<{ id: string; slug: string; name: string }[]>`SELECT id, slug, name FROM projects WHERE id = ${projectId}`
  if (!found) return { project: projectId, filed: [], failed: [], skipped: 'no such project' }
  const summary: RunSummary = { project: found.slug, filed: [], failed: [] }
  const automation = await automationOf(found.id)
  if (!automation?.platform || !automation.token || !automation.target_id) return { ...summary, skipped: 'no ticket destination' }
  const view = await readProductionErrors(found)
  if (view.state !== 'ready') return { ...summary, skipped: view.error ?? view.state }
  const access = { platform: automation.platform, token: automation.token, workspace: automation.workspace }
  const language: Language = automation.platform === 'plane' ? 'zh' : 'en'
  // A refused key fails every problem the same way; find out once, before asking the model for anything.
  const refused = await verify(access).then(() => null, (error: Error) => error)

  for (const problem of view.problems.filter((item) => item.kind === 'error' && item.needsTicket)) {
    if (!(await claim(problem.id, automation.updated_at))) continue
    const link = problemLink(ORIGIN, found.slug, problem.id)
    try {
      if (refused) throw refused
      let reading: string
      try {
        reading = await interpret(facts(problem), language)
      } catch (error) {
        // Every ticket carries its interpretation: without one, nothing is filed and the next run tries again.
        const message = `Interpretation: ${(error as Error).message}`.slice(0, 500)
        await sql()`UPDATE auto_tickets SET state = 'failed', error = ${message}, config_at = '-infinity', updated_at = now() WHERE problem_id = ${problem.id}`
        summary.failed.push({ problem: problem.key, error: message })
        continue
      }
      const url = await createTicket(access, {
        targetId: automation.target_id, teamId: automation.team_id, assigneeId: automation.assignee_id,
      }, ticketText({ language, problem, reading, link }))
      await sql()`
        INSERT INTO ticket_links (project_id, problem_id, url, attached_by)
        VALUES (${found.id}, ${problem.id}, ${url}, ${AUTOMATIC}) ON CONFLICT DO NOTHING
      `
      const slack = await announce({
        projectId: found.id, projectSlug: found.slug, projectName: found.name, ticket: url, problems: [problem], automatic: true, by: AUTOMATIC,
      })
      await sql()`
        UPDATE auto_tickets SET state = 'created', url = ${url}, error = ${slack ? `Slack: ${slack}` : null}, updated_at = now()
        WHERE problem_id = ${problem.id}
      `
      summary.filed.push(url)
    } catch (error) {
      const message = (error as Error).message.slice(0, 500)
      await sql()`UPDATE auto_tickets SET state = 'failed', error = ${message}, updated_at = now() WHERE problem_id = ${problem.id}`
      summary.failed.push({ problem: problem.key, error: message })
    }
  }
  return summary
}

// Only one process files tickets at a time: the production replica's timer, or an operator's manual run.
// The lock is held on one reserved connection, not in a transaction, because a run waits on other services.
export async function withRunLock<T>(run: () => Promise<T>): Promise<T | null> {
  const connection = await sql().reserve()
  try {
    const [lock] = await connection<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(hashtext('assertchecks:auto-tickets')) AS locked`
    if (!lock.locked) return null
    try {
      return await run()
    } finally {
      await connection`SELECT pg_advisory_unlock(hashtext('assertchecks:auto-tickets'))`
    }
  } finally {
    connection.release()
  }
}

// Every project with a ticket destination, one after another.
export async function fileAllAutomaticTickets(): Promise<RunSummary[]> {
  const projects = await sql()<{ project_id: string }[]>`
    SELECT project_id FROM error_automation WHERE platform IS NOT NULL AND target_id IS NOT NULL ORDER BY project_id
  `
  const results: RunSummary[] = []
  for (const row of projects) results.push(await fileAutomaticTickets(row.project_id))
  return results
}
