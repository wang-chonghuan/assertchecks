// Tickets on cases and on production problems (ASSERT-37): attach, remove, and the project's tickets
// grouped by ticket. Every read and write goes through the user's membership.
import { sql } from './db'
import { caseBugs, project } from './queries'
import { projectBugs } from './tickets'
import type { ProjectBugs } from '../lib/types'

export type Subject = { cases: string[] } | { problem: string }

// A pasted ticket link: any http(s) URL that fits the column.
export function ticketUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('ticket must be a URL')
  const url = value.trim()
  let parsed: URL
  try { parsed = new URL(url) } catch { throw new Error('ticket must be a URL') }
  if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || url.length > 256) {
    throw new Error('ticket must be an http(s) URL of at most 256 characters')
  }
  return url
}

// Attach one ticket to cases of the project or to one of its problems. A subject that already carries
// this ticket keeps it unchanged. Returns false when the project or the problem is not the user's.
export async function attachTicket(
  user: { id: string; email: string }, projectSlug: string, subject: Subject, url: string,
): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  if ('problem' in subject) {
    const rows = await sql()`
      INSERT INTO ticket_links (project_id, problem_id, url, attached_by)
      SELECT project_id, id, ${url}, ${user.email} FROM error_problems WHERE id = ${subject.problem} AND project_id = ${found.id}
      ON CONFLICT DO NOTHING RETURNING id
    `
    if (rows.length) return true
    const [known] = await sql()`SELECT 1 FROM error_problems WHERE id = ${subject.problem} AND project_id = ${found.id}`
    return Boolean(known)
  }
  await sql()`
    INSERT INTO ticket_links ${sql()(subject.cases.map((id) => ({ project_id: found.id, case_id: id, url, attached_by: user.email })),
      'project_id', 'case_id', 'url', 'attached_by')}
    ON CONFLICT DO NOTHING
  `
  return true
}

// Remove a ticket link pasted by mistake.
export async function removeTicket(user: { id: string }, projectSlug: string, linkId: string): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  const rows = await sql()`DELETE FROM ticket_links WHERE id = ${linkId} AND project_id = ${found.id} RETURNING id`
  return rows.length === 1
}

// The project's bugs for the Tests tab: those needing a ticket, those in progress, those fixed lately.
export async function projectBugsView(userId: string, projectSlug: string): Promise<ProjectBugs | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const bugs = await caseBugs(found.id)
  const ids = [...bugs.keys()]
  // Titles from the newest catalog that names the case.
  const titles = ids.length ? await sql()<{ id: string; title: string }[]>`
    SELECT DISTINCT ON (c->>'id') c->>'id' AS id, c->>'title' AS title
    FROM runs r JOIN checks k ON k.id = r.check_id,
         jsonb_array_elements(CASE WHEN jsonb_typeof(r.catalog->'cases') = 'array' THEN r.catalog->'cases' ELSE '[]'::jsonb END) c
    WHERE k.project_id = ${found.id} AND c->>'id' = ANY(${ids})
    ORDER BY c->>'id', r.finished_at DESC NULLS LAST
  ` : []
  const titleOf = new Map(titles.map((row) => [row.id, row.title ?? '']))
  return {
    project: { slug: found.slug, name: found.name },
    bugs: projectBugs([...bugs].map(([id, bug]) => ({ ...bug, case: id, title: titleOf.get(id) ?? '' })), new Date()),
  }
}
