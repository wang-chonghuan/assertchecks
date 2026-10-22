// The production-errors tab: a project's error source, the problems derived from its telemetry, and the
// decisions people make on them. Every read and write goes through the user's membership.
import { sql } from './db'
import { project } from './queries'
import { telemetry } from './telemetry'
import { assemble, seenProblems, withoutData, type StoredProblem } from './problems'
import type { ProblemKind, ProductionErrors, TicketLink } from '../lib/types'

interface SourceRow { workspace_id: string; workspace_path: string; roles: string[] | null }
interface ProblemRow {
  id: string; kind: ProblemKind; key: string; first_seen: Date; last_seen: Date
  decision: 'ticket' | 'ignored' | null; reason: string | null; decided_by: string | null; decided_at: Date | null
}
interface LinkRow { id: string; problem_id: string; url: string; attached_by: string; attached_at: Date }

const portal = (path: string) => `https://portal.azure.com/#@/resource${path}/logs`

// Tickets now live in ticket_links; a 'ticket' decision left by ASSERT-36 is read as no decision.
function toStored(row: ProblemRow, tickets: TicketLink[]): StoredProblem {
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
  }
}

export async function productionErrors(userId: string, projectSlug: string): Promise<ProductionErrors | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
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
  const [stored, links] = await Promise.all([
    sql()<ProblemRow[]>`
      SELECT id, kind, key, first_seen, last_seen, decision, reason, decided_by, decided_at
      FROM error_problems WHERE project_id = ${found.id}
    `,
    sql()<LinkRow[]>`
      SELECT id, problem_id, url, attached_by, attached_at FROM ticket_links
      WHERE project_id = ${found.id} AND problem_id IS NOT NULL ORDER BY attached_at DESC, id DESC
    `,
  ])
  const ticketsOf = new Map<string, TicketLink[]>()
  for (const link of links) {
    ticketsOf.set(link.problem_id, [...(ticketsOf.get(link.problem_id) ?? []), {
      id: link.id, url: link.url, by: link.attached_by, at: link.attached_at.toISOString(),
    }])
  }
  return assemble({
    project: info,
    stored: stored.map((row) => toStored(row, ticketsOf.get(row.id) ?? [])),
    data,
    now,
    portalUrl: portal(source.workspace_path),
  })
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
