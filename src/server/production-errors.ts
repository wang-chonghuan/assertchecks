// The production-errors tab: a project's error source, the problems derived from its telemetry, the
// decisions people make on them, and where its automatic tickets go (ASSERT-49). Reads and writes for a
// person go through their membership; the automatic run reads a project directly (auto-tickets.ts).
import { sql } from './db'
import { project, type ProjectRow } from './queries'
import { telemetry } from './telemetry'
import { assemble, seenProblems, withoutData, type StoredProblem } from './problems'
import { people, targets, verify, type Access, type Person, type Target } from './ticket-platforms'
import { postToSlack, webhookHint } from './slack'
import type { AutomationView, AutoTicketState, ProblemKind, ProductionErrors, TicketLink, TicketPlatform } from '../lib/types'

interface SourceRow { workspace_id: string; workspace_path: string; roles: string[] | null }
interface ProblemRow {
  id: string; kind: ProblemKind; key: string; first_seen: Date; last_seen: Date
  decision: 'ticket' | 'ignored' | null; reason: string | null; decided_by: string | null; decided_at: Date | null
}
interface LinkRow { id: string; problem_id: string; url: string; attached_by: string; attached_at: Date }
interface AutoRow { problem_id: string; state: AutoTicketState['state']; url: string | null; error: string | null; updated_at: Date }

// A project's automatic-ticket settings as stored, access key included. Server-side only.
export interface AutomationRow {
  project_id: string
  platform: TicketPlatform | null
  token: string | null
  workspace: string | null
  target_id: string | null
  target_name: string | null
  team_id: string | null
  assignee_id: string | null
  assignee_name: string | null
  slack_webhook: string | null
  updated_by: string
  updated_at: Date
}

const portal = (path: string) => `https://portal.azure.com/#@/resource${path}/logs`

// Tickets now live in ticket_links; a 'ticket' decision left by ASSERT-36 is read as no decision.
function toStored(row: ProblemRow, tickets: TicketLink[], auto: AutoRow | undefined): StoredProblem {
  return {
    id: row.id,
    kind: row.kind,
    key: row.key,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    ignored: row.decision === 'ignored' && row.decided_at
      ? { reason: row.reason ?? '', by: row.decided_by ?? 'unknown', at: row.decided_at.toISOString() }
      : null,
    tickets,
    auto: auto ? { state: auto.state, url: auto.url, error: auto.error, at: auto.updated_at.toISOString() } : null,
  }
}

export async function automationOf(projectId: string): Promise<AutomationRow | null> {
  const [row] = await sql()<AutomationRow[]>`SELECT * FROM error_automation WHERE project_id = ${projectId}`
  return row ?? null
}

export function automationView(row: AutomationRow | null): AutomationView | null {
  if (!row) return null
  return {
    platform: row.platform,
    workspace: row.workspace,
    target: row.target_id ? { id: row.target_id, name: row.target_name ?? row.target_id } : null,
    assignee: row.assignee_id ? { id: row.assignee_id, name: row.assignee_name ?? row.assignee_id } : null,
    slack: row.slack_webhook ? webhookHint(row.slack_webhook) : null,
    active: Boolean(row.platform && row.token && row.target_id),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
  }
}

// The tab's view of one project, for a member or for the automatic run.
export async function readProductionErrors(found: ProjectRow): Promise<ProductionErrors> {
  const info = { slug: found.slug, name: found.name }
  const now = new Date()
  const [source] = await sql()<SourceRow[]>`
    SELECT workspace_id, workspace_path, roles FROM error_sources WHERE project_id = ${found.id}
  `
  if (!source) return withoutData(info, 'not-connected', now, null, null)
  let data
  try {
    data = await telemetry({ workspaceId: source.workspace_id, roles: source.roles })
  } catch (error) {
    // Unreadable telemetry is shown as unreadable, never as a quiet day.
    return withoutData(info, 'unavailable', now, (error as Error).message, portal(source.workspace_path))
  }
  // Problems keep their first and last sighting beyond the workspace's retention.
  const seen = seenProblems(data).map((item) => ({
    project_id: found.id, kind: item.kind, key: item.key, first_seen: item.firstSeen, last_seen: item.lastSeen,
  }))
  if (seen.length) {
    await sql()`
      INSERT INTO error_problems ${sql()(seen, 'project_id', 'kind', 'key', 'first_seen', 'last_seen')}
      ON CONFLICT (project_id, kind, key) DO UPDATE SET
        first_seen = LEAST(error_problems.first_seen, EXCLUDED.first_seen),
        last_seen = GREATEST(error_problems.last_seen, EXCLUDED.last_seen)
    `
  }
  const [stored, links, autos, automation] = await Promise.all([
    sql()<ProblemRow[]>`
      SELECT id, kind, key, first_seen, last_seen, decision, reason, decided_by, decided_at
      FROM error_problems WHERE project_id = ${found.id}
    `,
    sql()<LinkRow[]>`
      SELECT id, problem_id, url, attached_by, attached_at FROM ticket_links
      WHERE project_id = ${found.id} AND problem_id IS NOT NULL ORDER BY attached_at DESC, id DESC
    `,
    sql()<AutoRow[]>`
      SELECT a.problem_id, a.state, a.url, a.error, a.updated_at FROM auto_tickets a
      JOIN error_problems p ON p.id = a.problem_id WHERE p.project_id = ${found.id}
    `,
    automationOf(found.id),
  ])
  const ticketsOf = new Map<string, TicketLink[]>()
  for (const link of links) {
    ticketsOf.set(link.problem_id, [...(ticketsOf.get(link.problem_id) ?? []), {
      id: link.id, url: link.url, by: link.attached_by, at: link.attached_at.toISOString(),
    }])
  }
  const autoOf = new Map(autos.map((row) => [row.problem_id, row]))
  return assemble({
    project: info,
    stored: stored.map((row) => toStored(row, ticketsOf.get(row.id) ?? [], autoOf.get(row.id))),
    data,
    now,
    portalUrl: portal(source.workspace_path),
    automation: automationView(automation),
  })
}

export async function productionErrors(userId: string, projectSlug: string): Promise<ProductionErrors | null> {
  const found = await project(userId, projectSlug)
  return found ? readProductionErrors(found) : null
}

export type Decision = { decision: 'ignored'; reason: string } | { decision: 'none' }

// Mark Not handling, or undo it; tickets are attached through ticket links. Returns false when the
// problem is not in a project the user belongs to.
export async function decideProblem(
  user: { id: string; email: string }, projectSlug: string, problemId: string, decision: Decision,
): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  const reason = decision.decision === 'ignored' ? decision.reason : null
  const decided = decision.decision !== 'none'
  const rows = await sql()`
    UPDATE error_problems SET
      decision = ${decided ? decision.decision : null},
      ticket_url = null,
      reason = ${reason},
      decided_by = ${decided ? user.email : null},
      decided_at = ${decided ? sql()`now()` : null}
    WHERE id = ${problemId} AND project_id = ${found.id}
    RETURNING id
  `
  return rows.length === 1
}

// What the settings form sends to reach a platform. An empty key means the saved one, when the platform
// and workspace are unchanged; a saved key is never sent back.
export interface AccessInput { platform: TicketPlatform; workspace: string | null; token: string | null }

function accessFor(input: AccessInput, saved: AutomationRow | null): Access {
  const workspace = input.platform === 'plane' ? input.workspace : null
  if (input.token) return { platform: input.platform, token: input.token, workspace }
  if (saved?.token && saved.platform === input.platform && (input.platform === 'linear' || saved.workspace === workspace)) {
    return { platform: input.platform, token: saved.token, workspace }
  }
  throw new Error('enter the access key')
}

// The account a key belongs to and the projects tickets can go to; the form's first step.
export async function platformTargets(
  user: { id: string }, projectSlug: string, input: AccessInput,
): Promise<{ account: string; targets: Target[] } | null> {
  const found = await project(user.id, projectSlug)
  if (!found) return null
  const access = accessFor(input, await automationOf(found.id))
  return { account: await verify(access), targets: await targets(access) }
}

export async function platformPeople(
  user: { id: string }, projectSlug: string, input: AccessInput, target: { id: string; teamId: string | null },
): Promise<Person[] | null> {
  const found = await project(user.id, projectSlug)
  if (!found) return null
  return people(accessFor(input, await automationOf(found.id)), target)
}

export interface DestinationInput extends AccessInput {
  target: { id: string; name: string; teamId: string | null }
  assignee: { id: string; name: string } | null
}

// Saves where tickets go after proving the key reaches that target. Changing it lets problems whose
// automatic ticket failed be tried again.
export async function saveDestination(user: { id: string; email: string }, projectSlug: string, input: DestinationInput): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  const access = accessFor(input, await automationOf(found.id))
  const reachable = await targets(access)
  if (!reachable.some((target) => target.id === input.target.id && target.teamId === input.target.teamId)) {
    throw new Error('that project is not reachable with this key')
  }
  if (input.platform === 'linear' && !input.target.teamId) throw new Error('Linear tickets need a team')
  if (input.assignee && !(await people(access, input.target)).some((person) => person.id === input.assignee?.id)) {
    throw new Error('that person cannot be assigned there')
  }
  const values = {
    platform: access.platform, token: access.token, workspace: access.workspace,
    target_id: input.target.id, target_name: input.target.name, team_id: input.target.teamId,
    assignee_id: input.assignee?.id ?? null, assignee_name: input.assignee?.name ?? null,
  }
  await sql()`
    INSERT INTO error_automation (project_id, platform, token, workspace, target_id, target_name, team_id, assignee_id, assignee_name, updated_by)
    VALUES (${found.id}, ${values.platform}, ${values.token}, ${values.workspace}, ${values.target_id}, ${values.target_name},
      ${values.team_id}, ${values.assignee_id}, ${values.assignee_name}, ${user.email})
    ON CONFLICT (project_id) DO UPDATE SET platform = EXCLUDED.platform, token = EXCLUDED.token, workspace = EXCLUDED.workspace,
      target_id = EXCLUDED.target_id, target_name = EXCLUDED.target_name, team_id = EXCLUDED.team_id,
      assignee_id = EXCLUDED.assignee_id, assignee_name = EXCLUDED.assignee_name, updated_by = EXCLUDED.updated_by, updated_at = now()
  `
  return true
}

// Stops automatic tickets: forgets the platform and its key. The Slack channel stays.
export async function removeDestination(user: { id: string; email: string }, projectSlug: string): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  await sql()`
    UPDATE error_automation SET platform = null, token = null, workspace = null, target_id = null, target_name = null,
      team_id = null, assignee_id = null, assignee_name = null, updated_by = ${user.email}, updated_at = now()
    WHERE project_id = ${found.id}
  `
  return true
}

// Saves the channel after Slack accepted a test message there; null removes it.
export async function saveSlack(user: { id: string; email: string }, projectSlug: string, webhook: string | null): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  if (webhook) {
    await postToSlack(webhook, `AssertChecks will post the tickets on *${found.name}*'s production errors in this channel.`)
  }
  await sql()`
    INSERT INTO error_automation (project_id, slack_webhook, updated_by) VALUES (${found.id}, ${webhook}, ${user.email})
    ON CONFLICT (project_id) DO UPDATE SET slack_webhook = EXCLUDED.slack_webhook, updated_by = EXCLUDED.updated_by, updated_at = now()
  `
  return true
}
