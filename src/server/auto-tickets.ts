// Automatic tickets for production errors (ASSERT-49). For a project with a ticket destination, every
// error problem in Needs a ticket gets one ticket: AssertChecks claims the problem, writes an automatic
// interpretation, files the ticket on the project's platform, attaches it, and posts it to Slack.
import { sql } from './db'
import { automationOf, readProductionErrors } from './production-errors'
import { createTicket, verify, type FiledTicket } from './ticket-platforms'
import { interpret, type ErrorFacts, type Language, type Severity } from './interpret'
import { postToSlack } from './slack'
import { overflowText, problemLink, slackText, ticketText } from './ticket-text'
import { readAlertConfig, startEscalation } from './escalation'
import { ORIGIN } from '../lib/connect-guide'
import type { ProblemView } from '../lib/types'

// A short, user-data-free description of a problem for an escalation notice: the error type and where it
// happened, never the message body.
const shortProblem = (problem: ProblemView): string =>
  `${problem.latest?.type ?? problem.key}${problem.place ? ` at ${problem.place}` : ''} (${problem.browser ? 'browser' : problem.role ?? 'server'})`

// Who automatic tickets are attached by, as the page shows it.
export const AUTOMATIC = 'AssertChecks (automatic)'

// `grouped` counts the problems put on an overflow ticket instead of one of their own.
export interface RunSummary { project: string; filed: string[]; failed: { problem: string; error: string }[]; grouped: number; skipped?: string }

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
  surge?: boolean
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
      surge: input.surge,
    }))
    return null
  } catch (error) {
    return (error as Error).message
  }
}

// At most this many tickets per project in any 60 minutes; the rest of that hour's problems share one
// overflow ticket, the 11th (owner, 2026-11-06).
export const PER_HOUR = 10

export interface FileOptions {
  // File at most this many tickets in this run, most frequent problems first: an operator's careful run.
  limit?: number
  // The hourly cap; only an operator trying the overflow on a test project lowers it.
  perHour?: number
}

// Records why a problem's ticket was not filed. A network blip or a platform outage passes on its own: try
// again next run. A refused key or a rejected request does not: wait until someone changes the settings.
async function recordFailure(problemId: string, error: unknown): Promise<string> {
  // Node's "fetch failed" hides why; its cause names it (ETIMEDOUT, ECONNRESET, ...).
  const cause = (error as { cause?: { code?: string } }).cause?.code
  const message = `${(error as Error).message}${cause ? ` (${cause})` : ''}`.slice(0, 500)
  const passing = /fetch failed|ETIMEDOUT|ECONNRESET|timed? ?out|aborted|HTTP (429|5\d\d)/i.test(message)
  await sql()`
    UPDATE auto_tickets SET state = 'failed', error = ${message}, updated_at = now(),
      config_at = CASE WHEN ${passing} THEN '-infinity'::timestamptz ELSE config_at END
    WHERE problem_id = ${problemId}
  `
  return message
}

async function recordFiled(problemIds: string[], url: string, overflow: boolean, note: string | null, severity: Severity): Promise<void> {
  await sql()`
    UPDATE auto_tickets SET state = 'created', url = ${url}, overflow = ${overflow}, error = ${note}, severity = ${severity}, filed_at = now(), updated_at = now()
    WHERE problem_id IN ${sql()(problemIds)}
  `
}

// The project's last 60 minutes: how many ordinary tickets were filed, and the overflow ticket opened in
// that time, if any, which later problems of the hour join.
async function lastHour(projectId: string): Promise<{ filed: number; overflow: string | null }> {
  const [row] = await sql()<{ filed: number; overflow: string | null }[]>`
    SELECT
      (SELECT count(*)::int FROM auto_tickets a JOIN error_problems e ON e.id = a.problem_id
        WHERE e.project_id = ${projectId} AND a.state = 'created' AND NOT a.overflow AND a.filed_at > now() - interval '1 hour') AS filed,
      (SELECT a.url FROM auto_tickets a JOIN error_problems e ON e.id = a.problem_id
        WHERE e.project_id = ${projectId} AND a.state = 'created' AND a.overflow
        GROUP BY a.url HAVING min(a.filed_at) > now() - interval '1 hour' ORDER BY min(a.filed_at) DESC LIMIT 1) AS overflow
  `
  return row
}

const attach = (projectId: string, problems: ProblemView[], url: string) => sql()`
  INSERT INTO ticket_links ${sql()(problems.map((problem) => ({ project_id: projectId, problem_id: problem.id, url, attached_by: AUTOMATIC })),
    'project_id', 'problem_id', 'url', 'attached_by')}
  ON CONFLICT DO NOTHING
`

export async function fileAutomaticTickets(projectId: string, options: FileOptions = {}): Promise<RunSummary> {
  const limit = options.limit ?? Infinity
  const perHour = options.perHour ?? PER_HOUR
  const [found] = await sql()<{ id: string; slug: string; name: string }[]>`SELECT id, slug, name FROM projects WHERE id = ${projectId}`
  if (!found) return { project: projectId, filed: [], failed: [], grouped: 0, skipped: 'no such project' }
  const summary: RunSummary = { project: found.slug, filed: [], failed: [], grouped: 0 }
  const automation = await automationOf(found.id)
  if (!automation?.platform || !automation.token || !automation.target_id) return { ...summary, skipped: 'no ticket destination' }
  const view = await readProductionErrors(found)
  if (view.state !== 'ready') return { ...summary, skipped: view.error ?? view.state }
  const access = { platform: automation.platform, token: automation.token, workspace: automation.workspace }
  const at = { targetId: automation.target_id, teamId: automation.team_id, assigneeId: automation.assignee_id }
  const language: Language = automation.platform === 'plane' ? 'zh' : 'en'
  const announceAll = (url: string, problems: ProblemView[], surge: boolean) => announce({
    projectId: found.id, projectSlug: found.slug, projectName: found.name, ticket: url, problems, automatic: true, by: AUTOMATIC, surge,
  })
  // A refused key fails every problem the same way; find out once, before asking the model for anything.
  const refused = await verify(access).then(() => null, (error: Error) => error)
  const hour = await lastHour(found.id)
  let filedThisHour = hour.filed
  const spill: ProblemView[] = []
  // BF alert config (ASSERT-56): with it, urgent/critical tickets drive the escalation instead of a plain
  // Slack post; low tickets and projects without config keep the ordinary post.
  const alert = await readAlertConfig(found.id)
  const notifyFiled = async (filed: FiledTicket, problems: ProblemView[], severity: Severity, problem: string, surge: boolean): Promise<string | null> => {
    if (alert && (severity === 'urgent' || severity === 'critical') && automation.platform) {
      await startEscalation({
        projectId: found.id, projectName: found.name, url: filed.url, issueId: filed.id,
        platform: automation.platform, severity, env: 'prod', problem,
      })
      return null
    }
    return announceAll(filed.url, problems, surge)
  }

  for (const problem of view.problems.filter((item) => item.kind === 'error' && item.needsTicket)) {
    if (summary.filed.length + summary.failed.length >= limit) break
    if (!(await claim(problem.id, automation.updated_at))) continue
    // Past the hour's limit a problem waits for the overflow ticket below.
    if (filedThisHour >= perHour) {
      spill.push(problem)
      continue
    }
    try {
      if (refused) throw refused
      let reading: string
      let severity: Severity
      try {
        ({ reading, severity } = await interpret(facts(problem), language))
      } catch (error) {
        // Every ticket carries its interpretation: without one, nothing is filed and the next run tries again.
        const message = `Interpretation: ${(error as Error).message}`.slice(0, 500)
        await sql()`UPDATE auto_tickets SET state = 'failed', error = ${message}, config_at = '-infinity', updated_at = now() WHERE problem_id = ${problem.id}`
        summary.failed.push({ problem: problem.key, error: message })
        continue
      }
      const filed = await createTicket(access, at, ticketText({ language, problem, reading, link: problemLink(ORIGIN, found.slug, problem.id) }))
      await attach(found.id, [problem], filed.url)
      const slack = await notifyFiled(filed, [problem], severity, shortProblem(problem), false)
      await recordFiled([problem.id], filed.url, false, slack ? `Slack: ${slack}` : null, severity)
      summary.filed.push(filed.url)
      filedThisHour += 1
    } catch (error) {
      summary.failed.push({ problem: problem.key, error: await recordFailure(problem.id, error) })
    }
  }

  if (spill.length) {
    const ids = spill.map((problem) => problem.id)
    try {
      if (hour.overflow) {
        // The hour already has its overflow ticket: these problems join it quietly (its escalation, if any,
        // was started when the overflow ticket was first filed).
        await attach(found.id, spill, hour.overflow)
        await recordFiled(ids, hour.overflow, true, null, 'urgent')
        summary.grouped += spill.length
      } else {
        if (refused) throw refused
        const filed = await createTicket(access, at, overflowText({
          language, perHour, problems: spill.map((problem) => ({ problem, link: problemLink(ORIGIN, found.slug, problem.id) })),
        }))
        await attach(found.id, spill, filed.url)
        // An error surge needs a response: the overflow ticket is treated as urgent.
        const slack = await notifyFiled(filed, spill, 'urgent', `Production error surge: ${spill.length} problems in an hour`, true)
        await recordFiled(ids, filed.url, true, slack ? `Slack: ${slack}` : null, 'urgent')
        summary.filed.push(filed.url)
        summary.grouped += spill.length
      }
    } catch (error) {
      for (const problem of spill) summary.failed.push({ problem: problem.key, error: await recordFailure(problem.id, error) })
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
