// Tickets on cases and on production problems (ASSERT-37): attach and remove. Every read and write goes
// through the user's membership.
import { sql } from './db'
import { project } from './queries'

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

// Case IDs from a request, each once.
export function caseIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 200 || value.some((id) => typeof id !== 'string' || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id))) {
    throw new Error('cases must be a list of case IDs')
  }
  return [...new Set(value as string[])]
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
  await insertCaseLinks(found.id, subject.cases, url, user.email)
  return true
}

// The cases that carry this ticket now and did not before. The page's Attach and the client's link share it.
async function insertCaseLinks(projectId: string, cases: string[], url: string, by: string): Promise<string[]> {
  const rows = await sql()<{ case_id: string }[]>`
    INSERT INTO ticket_links ${sql()(cases.map((id) => ({ project_id: projectId, case_id: id, url, attached_by: by })),
      'project_id', 'case_id', 'url', 'attached_by')}
    ON CONFLICT DO NOTHING RETURNING case_id
  `
  return rows.map((row) => row.case_id)
}

// The client's link (ASSERT-38), as the signed-in person. Only cases in the newest catalog of one of the
// project's checks, so a typo cannot put a ticket on a case that does not exist. Null when the project is
// not the person's.
export async function linkFromClient(
  user: { id: string; email: string }, projectSlug: string, cases: string[], url: string,
): Promise<{ unknown: string[] } | { linked: string[]; already: string[] } | null> {
  const found = await project(user.id, projectSlug)
  if (!found) return null
  const known = await sql()<{ id: string }[]>`
    SELECT DISTINCT c->>'id' AS id FROM checks k
    CROSS JOIN LATERAL (
      SELECT catalog FROM runs WHERE check_id = k.id AND jsonb_typeof(catalog->'cases') = 'array'
      ORDER BY finished_at DESC NULLS LAST, id DESC LIMIT 1
    ) newest
    CROSS JOIN LATERAL jsonb_array_elements(newest.catalog->'cases') c
    WHERE k.project_id = ${found.id}
  `
  const ids = new Set(known.map((row) => row.id))
  const unknown = cases.filter((id) => !ids.has(id))
  if (unknown.length) return { unknown }
  const linked = await insertCaseLinks(found.id, cases, url, user.email)
  return { linked, already: cases.filter((id) => !linked.includes(id)) }
}

// Remove a ticket link pasted by mistake.
export async function removeTicket(user: { id: string }, projectSlug: string, linkId: string): Promise<boolean> {
  const found = await project(user.id, projectSlug)
  if (!found) return false
  const rows = await sql()`DELETE FROM ticket_links WHERE id = ${linkId} AND project_id = ${found.id} RETURNING id`
  return rows.length === 1
}
