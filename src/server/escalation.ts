// BF alert notification and no-response escalation (ASSERT-56). When a BF ticket is filed with a severity
// that needs a response, one escalation record is created and the first notice is sent. A background task
// (plugins/escalation.ts) then, about once a minute, checks whether a responsible person has replied on the
// Linear ticket and, if not, escalates at the right time. Classification happens once at filing; this task
// never re-runs the model, re-collects telemetry or files tickets.
import { sql } from './db'
import { automationOf } from './production-errors'
import { issueComments, type Access } from './ticket-platforms'
import { postToSlack, slackMention } from './slack'
import { placeCall, twilioReady, type TwilioConfig } from './twilio'

export type Role = 'primary' | 'backup' | 'final'

export interface Contact { role: Role; name: string; slackId: string | null; phone: string | null; email: string | null }

export interface AlertConfig {
  twilio: TwilioConfig
  contacts: Contact[]
  // Out-of-hours on-call rotation: an ordered list of roles and the first handover instant (a Monday 09:00
  // Ireland). Empty/null means no rotation, so out-of-hours critical falls back to the fixed primary.
  rotation: Role[]
  rotationStart: Date | null
  webhook: string | null
}

// The highest escalation stage each severity can reach: urgent escalates once (to the backup); critical
// escalates twice (backup, then the final person).
export const MAX_STAGE: Record<'urgent' | 'critical', number> = { urgent: 1, critical: 2 }
// The contact notified at each stage.
const ROLE_AT: Record<number, Role> = { 0: 'primary', 1: 'backup', 2: 'final' }

// Ireland working hours: Monday–Friday 09:00–17:30 local (Europe/Dublin handles GMT/IST itself).
const WORK_START_MIN = 9 * 60
const WORK_END_MIN = 17 * 60 + 30
const dublin = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

// Local weekday (0=Sun..6=Sat) and minutes-since-midnight for an instant, in Dublin time.
function dublinParts(at: Date): { weekday: number; minutes: number } {
  const parts = Object.fromEntries(dublin.formatToParts(at).map((part) => [part.type, part.value]))
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday as string)
  return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

export function isWorkingTime(at: Date): boolean {
  const { weekday, minutes } = dublinParts(at)
  return weekday >= 1 && weekday <= 5 && minutes >= WORK_START_MIN && minutes < WORK_END_MIN
}

// Milliseconds of Ireland working time between two instants, stepping a minute at a time (DST-safe via the
// Dublin formatter). Capped so a very old unescalated row cannot loop unbounded.
export function workingMsBetween(start: Date, end: Date): number {
  const STEP = 60_000
  const MAX_STEPS = 31 * 24 * 60
  let count = 0
  let steps = 0
  for (let t = start.getTime(); t < end.getTime() && steps < MAX_STEPS; t += STEP, steps += 1) {
    if (isWorkingTime(new Date(t))) count += 1
  }
  return count * STEP
}

// The highest stage a critical ticket should have reached by `now`: 1 at +15 min, 2 at +30 min.
export function criticalStageDue(created: Date, now: Date): number {
  const mins = (now.getTime() - created.getTime()) / 60_000
  if (mins >= 30) return 2
  if (mins >= 15) return 1
  return 0
}

// Whether an urgent ticket should escalate to its backup: one hour of working time has passed and it is a
// working moment now (so the escalation call never lands outside Ireland working hours).
export function urgentEscalates(created: Date, now: Date): boolean {
  return isWorkingTime(now) && workingMsBetween(created, now) >= 60 * 60_000
}

// The first human reply by one of the responsible people after the first notice; null if none. Bot and
// integration comments, and anyone else's comments, do not count.
export function confirmationFrom(
  comments: { authorEmail: string | null; createdAt: string; isBot: boolean }[], emails: Set<string>, since: Date,
): { email: string; at: string } | null {
  const hits = comments
    .filter((comment) => !comment.isBot && comment.authorEmail && emails.has(comment.authorEmail) && new Date(comment.createdAt) > since)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const first = hits[0]
  return first ? { email: first.authorEmail!, at: first.createdAt } : null
}

const SEVERITY_LABEL: Record<'urgent' | 'critical', string> = { urgent: 'Urgent', critical: 'Critical' }

// The Slack notice for one stage: environment, a short problem, the ticket link and who must respond now.
// It carries no error message body, so no user data leaks into the channel.
export function escalationMessage(input: {
  severity: 'urgent' | 'critical'; projectName: string; env: string; problem: string; url: string; contact: Contact; calling: boolean
}): string {
  const who = slackMention(input.contact.slackId, input.contact.name)
  return [
    `:rotating_light: *${SEVERITY_LABEL[input.severity]}* — ${input.projectName} (${input.env})`,
    input.problem,
    `Ticket: ${input.url}`,
    `Please respond: ${who}${input.calling ? ' (calling now)' : ''}`,
  ].join('\n')
}

function parseContacts(value: unknown): Contact[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw): Contact[] => {
    const row = raw as Record<string, unknown>
    const role = row.role
    if (role !== 'primary' && role !== 'backup' && role !== 'final') return []
    return [{
      role,
      name: typeof row.name === 'string' ? row.name : role,
      slackId: typeof row.slack_id === 'string' ? row.slack_id : null,
      phone: typeof row.phone === 'string' ? row.phone : null,
      email: typeof row.email === 'string' ? row.email.toLowerCase() : null,
    }]
  })
}

export const contactFor = (contacts: Contact[], role: Role): Contact | undefined => contacts.find((contact) => contact.role === role)

// Weekly on-call rotation (ASSERT-56). `rotation` is an ordered list of roles and `start` is the first handover
// instant (a Monday 09:00 Ireland). Each whole week since the start advances the on-call role by one, wrapping.
// A DST change can move the handover moment by an hour twice a year, which does not matter for on-call.
export const ROTATION_WEEK_MS = 7 * 24 * 60 * 60_000

export function onCallIndex(start: Date, now: Date, length: number): number {
  if (length <= 0) return 0
  const weeks = Math.floor((now.getTime() - start.getTime()) / ROTATION_WEEK_MS)
  return weeks <= 0 ? 0 : weeks % length
}

export function onCallRole(rotation: Role[], start: Date | null, now: Date): Role | null {
  if (!start || rotation.length === 0) return null
  return rotation[onCallIndex(start, now, rotation.length)]
}

// The contact on call for `now`, or null when no rotation is configured.
export function onCallContact(config: AlertConfig, now: Date): Contact | null {
  const role = onCallRole(config.rotation, config.rotationStart, now)
  return role ? contactFor(config.contacts, role) ?? null : null
}

// Out-of-hours re-ring cadence: the on-call person is rung again about every 15 minutes until they reply.
export const OOH_RECALL_MS = 15 * 60_000
export function recallDue(lastCallAt: Date | null, now: Date): boolean {
  return !lastCallAt || now.getTime() - lastCallAt.getTime() >= OOH_RECALL_MS
}

const parseRoles = (value: unknown): Role[] =>
  Array.isArray(value) ? value.filter((role): role is Role => role === 'primary' || role === 'backup' || role === 'final') : []

export async function readAlertConfig(projectId: string): Promise<AlertConfig | null> {
  const [row] = await sql()<{ twilio_account_sid: string | null; twilio_api_key_sid: string | null; twilio_api_secret: string | null; twilio_from: string | null; contacts: unknown; rotation: unknown; rotation_start: Date | null }[]>`
    SELECT twilio_account_sid, twilio_api_key_sid, twilio_api_secret, twilio_from, contacts, rotation, rotation_start FROM alert_config WHERE project_id = ${projectId}
  `
  if (!row) return null
  const automation = await automationOf(projectId)
  return {
    twilio: { accountSid: row.twilio_account_sid, apiKeySid: row.twilio_api_key_sid, apiSecret: row.twilio_api_secret, from: row.twilio_from },
    contacts: parseContacts(row.contacts),
    rotation: parseRoles(row.rotation),
    rotationStart: row.rotation_start,
    webhook: automation?.slack_webhook ?? null,
  }
}

const allowedNumbers = (config: AlertConfig): string[] => config.contacts.map((contact) => contact.phone).filter((phone): phone is string => Boolean(phone))

const logEntry = (stage: number, kind: 'slack' | 'call', ok: boolean, detail: string) =>
  ({ stage, kind, ok, detail, at: new Date().toISOString() })

// Sends one stage's Slack notice and, when `call` is set, places the short ring. Never throws: each outcome
// is appended to the row's log so a failure is recorded, not treated as delivered or as a confirmation.
async function notify(escalationId: string, config: AlertConfig, input: {
  severity: 'urgent' | 'critical'; projectName: string; env: string; problem: string; url: string; stage: number; contact: Contact; call: boolean
}): Promise<void> {
  const calling = input.call && twilioReady(config.twilio) && Boolean(input.contact.phone)
  const log: ReturnType<typeof logEntry>[] = []
  if (config.webhook) {
    try {
      await postToSlack(config.webhook, escalationMessage({ ...input, calling }))
      log.push(logEntry(input.stage, 'slack', true, `@${input.contact.role}`))
    } catch (error) {
      log.push(logEntry(input.stage, 'slack', false, (error as Error).message.slice(0, 200)))
    }
  }
  if (input.call) {
    if (!calling) {
      log.push(logEntry(input.stage, 'call', false, input.contact.phone ? 'Twilio not configured' : 'no phone number'))
    } else {
      try {
        const sid = await placeCall(config.twilio, input.contact.phone!, allowedNumbers(config))
        log.push(logEntry(input.stage, 'call', true, sid))
      } catch (error) {
        log.push(logEntry(input.stage, 'call', false, (error as Error).message.slice(0, 200)))
      }
    }
  }
  if (log.length) {
    await sql()`UPDATE ticket_escalations SET log = log || ${sql().json(log)}::jsonb WHERE id = ${escalationId}`
  }
}

// Called right after a BF ticket is filed with urgent/critical severity. Creates the single escalation
// record for the ticket URL (an overflow ticket shared by several problems still gets exactly one), then
// sends the first notice: Slack and, for critical, a call too. During working hours the first contact is the
// fixed primary; outside working hours a critical ticket instead rings the week's on-call person. Idempotent:
// if the row already exists (the overflow ticket's later problems), nothing is sent again.
export async function startEscalation(input: {
  projectId: string; projectName: string; url: string; issueId: string | null; platform: 'plane' | 'linear'
  severity: 'urgent' | 'critical'; env: string; problem: string
}, now: Date = new Date()): Promise<void> {
  const [row] = await sql()<{ id: string }[]>`
    INSERT INTO ticket_escalations (project_id, url, issue_id, platform, severity, stage)
    VALUES (${input.projectId}, ${input.url}, ${input.issueId}, ${input.platform}, ${input.severity}, 0)
    ON CONFLICT (project_id, url) DO NOTHING
    RETURNING id
  `
  if (!row) return
  const config = await readAlertConfig(input.projectId)
  if (!config) return
  const outOfHours = input.severity === 'critical' && !isWorkingTime(now)
  const contact = outOfHours ? (onCallContact(config, now) ?? contactFor(config.contacts, 'primary')) : contactFor(config.contacts, 'primary')
  if (!contact) return
  await notify(row.id, config, {
    severity: input.severity, projectName: input.projectName, env: input.env, problem: input.problem,
    url: input.url, stage: 0, contact, call: input.severity === 'critical',
  })
  if (outOfHours) await sql()`UPDATE ticket_escalations SET last_call_at = ${now} WHERE id = ${row.id}`
}

interface EscalationRow {
  id: string; project_id: string; url: string; issue_id: string | null; platform: 'plane' | 'linear'
  severity: 'urgent' | 'critical'; stage: number; created_at: Date; last_call_at: Date | null; slug: string; name: string
}

// One pass of the background task: confirm or escalate each open escalation. Returns a short summary for the
// log line. Reads each project's Linear access once; never files tickets or calls the model.
export async function runEscalations(now: Date = new Date()): Promise<{ confirmed: number; escalated: number; open: number }> {
  // An urgent row closes once it has escalated to its backup (stage 1). A critical row stays open until it is
  // confirmed, so it can keep ringing the on-call person out of hours; a 24-hour cap stops a row that nobody
  // ever acknowledges from ringing for days.
  const rows = await sql()<EscalationRow[]>`
    SELECT e.id, e.project_id, e.url, e.issue_id, e.platform, e.severity, e.stage, e.created_at, e.last_call_at, p.slug, p.name
    FROM ticket_escalations e JOIN projects p ON p.id = e.project_id
    WHERE e.confirmed_at IS NULL
      AND ( (e.severity = 'urgent' AND e.stage < 1)
         OR (e.severity = 'critical' AND e.created_at > now() - interval '24 hours') )
    ORDER BY e.created_at
  `
  let confirmed = 0
  let escalated = 0
  const configs = new Map<string, AlertConfig | null>()
  const accesses = new Map<string, Access | null>()
  const config = async (projectId: string) => {
    if (!configs.has(projectId)) configs.set(projectId, await readAlertConfig(projectId))
    return configs.get(projectId)!
  }
  const access = async (projectId: string): Promise<Access | null> => {
    if (!accesses.has(projectId)) {
      const automation = await automationOf(projectId)
      accesses.set(projectId, automation?.platform && automation.token ? { platform: automation.platform, token: automation.token, workspace: automation.workspace } : null)
    }
    return accesses.get(projectId)!
  }

  for (const row of rows) {
    const cfg = await config(row.project_id)
    if (!cfg) continue
    const emails = new Set(cfg.contacts.map((contact) => contact.email).filter((email): email is string => Boolean(email)))

    // Confirmation: a human reply by a responsible person after the first notice stops the escalation.
    const acc = await access(row.project_id)
    if (acc && row.issue_id) {
      try {
        const got = confirmationFrom(await issueComments(acc, row.issue_id), emails, row.created_at)
        if (got) {
          await sql()`UPDATE ticket_escalations SET confirmed_at = now(), confirmed_by = ${got.email}, checked_at = now() WHERE id = ${row.id}`
          confirmed += 1
          continue
        }
      } catch {
        // A transient read failure just means we check again next pass; it is never taken as confirmation.
      }
    }

    // Not confirmed, outside working hours, critical: ring the week's on-call person, again about every 15
    // minutes, until they reply. The other people are not woken at night; the stage ladder is left untouched.
    if (row.severity === 'critical' && !isWorkingTime(now)) {
      if (recallDue(row.last_call_at, now)) {
        const contact = onCallContact(cfg, now) ?? contactFor(cfg.contacts, 'primary')
        if (contact) {
          await notify(row.id, cfg, {
            severity: 'critical', projectName: row.name, env: 'prod',
            problem: 'Critical ticket still unacknowledged (out of hours).', url: row.url, stage: row.stage, contact, call: true,
          })
          escalated += 1
        }
        await sql()`UPDATE ticket_escalations SET last_call_at = ${now}, checked_at = now() WHERE id = ${row.id}`
      } else {
        await sql()`UPDATE ticket_escalations SET checked_at = now() WHERE id = ${row.id}`
      }
      continue
    }

    // Not confirmed: escalate to the next person if the time for the next stage has come (working hours).
    const target = row.severity === 'critical' ? criticalStageDue(row.created_at, now) : (urgentEscalates(row.created_at, now) ? 1 : 0)
    if (target > row.stage) {
      const next = row.stage + 1
      const contact = contactFor(cfg.contacts, ROLE_AT[next])
      if (contact) {
        await notify(row.id, cfg, {
          severity: row.severity, projectName: row.name, env: 'prod',
          problem: `Ticket still unacknowledged after ${next === 2 ? '30 minutes' : row.severity === 'critical' ? '15 minutes' : 'one working hour'}.`,
          url: row.url, stage: next, contact, call: true,
        })
      }
      if (next === 2) await sql()`UPDATE ticket_escalations SET stage = ${next}, stage2_at = ${now}, checked_at = now() WHERE id = ${row.id}`
      else await sql()`UPDATE ticket_escalations SET stage = ${next}, stage1_at = ${now}, checked_at = now() WHERE id = ${row.id}`
      escalated += 1
    } else {
      await sql()`UPDATE ticket_escalations SET checked_at = now() WHERE id = ${row.id}`
    }
  }
  return { confirmed, escalated, open: rows.length }
}

// Only one process runs the escalation pass at a time (the production replica's timer). Its own lock, held
// on a reserved connection, so it never contends with the automatic-tickets run.
export async function withEscalationLock<T>(run: () => Promise<T>): Promise<T | null> {
  const connection = await sql().reserve()
  try {
    const [lock] = await connection<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(hashtext('assertchecks:escalation')) AS locked`
    if (!lock.locked) return null
    try {
      return await run()
    } finally {
      await connection`SELECT pg_advisory_unlock(hashtext('assertchecks:escalation'))`
    }
  } finally {
    connection.release()
  }
}
