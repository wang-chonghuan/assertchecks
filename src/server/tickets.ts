// Pure judgement of tickets on cases from run results (ASSERT-37). Nothing here reads the database, so
// every rule is unit-tested. A ticket is judged per check: only that check's runs that included the case
// after the ticket was attached count.
import type { CaseTickets, ProjectTicket, TicketLink, TicketOnCheck, TicketState } from '../lib/types'

const DAY = 24 * 60 * 60 * 1000
// Verified tickets stay under "recent" this long.
const RECENT_DAYS = 14

// One run of a check that included the case.
export interface CaseRun { runId: string; finishedAt: Date; passed: boolean }

export function ticketOnCheck(link: TicketLink, runs: CaseRun[]): TicketOnCheck {
  const attached = new Date(link.at).getTime()
  const since = runs.filter((run) => run.finishedAt.getTime() > attached)
    .sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime())
  const failed = since.filter((run) => !run.passed).length
  const last = since.at(-1)
  let state: TicketState = 'waiting'
  let verifiedAt: string | null = null
  if (last && !last.passed) state = 'failing'
  else if (last) {
    // The streak of passes the newest run ends; verified once it is two runs long.
    let start = since.length - 1
    while (start > 0 && since[start - 1].passed) start--
    if (since.length - start >= 2) {
      state = 'verified'
      verifiedAt = since[start + 1].finishedAt.toISOString()
    } else state = 'passing'
  }
  return { ...link, state, since: since.map((run) => ({ runId: run.runId, passed: run.passed })), failed, verifiedAt }
}

// Two passes in a row among these runs, anywhere.
function everVerified(since: { passed: boolean }[]): boolean {
  return since.some((run, index) => index > 0 && run.passed && since[index - 1].passed)
}

// A case's tickets on one check, newest first, and whether it failed again after one was verified.
export function caseTickets(links: TicketLink[], runs: CaseRun[]): CaseTickets {
  const tickets = [...links].sort((a, b) => b.at.localeCompare(a.at)).map((link) => ticketOnCheck(link, runs))
  const newest = [...runs].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())[0]
  const recurred = Boolean(newest && !newest.passed &&
    tickets.some((ticket) => everVerified(ticket.since.slice(0, -1))))
  return { tickets, recurred }
}

// Every ticket of the project's cases, grouped by ticket, with each case's state on every check.
export function projectTickets(input: {
  links: (TicketLink & { case: string })[]
  checks: { slug: string; name: string; runs: Map<string, CaseRun[]> }[]
  titles: Map<string, string>
  now: Date
}): ProjectTicket[] {
  const byUrl = new Map<string, (TicketLink & { case: string })[]>()
  for (const link of input.links) byUrl.set(link.url, [...(byUrl.get(link.url) ?? []), link])
  const tickets = [...byUrl.entries()].map(([url, links]): ProjectTicket => {
    const cases = links.map((link) => ({
      case: link.case,
      title: input.titles.get(link.case) ?? '',
      checks: input.checks
        .map((check) => ({ check, judged: ticketOnCheck(link, check.runs.get(link.case) ?? []) }))
        // A check that never ran the case says nothing about this ticket.
        .filter(({ check }) => (check.runs.get(link.case) ?? []).length > 0)
        .map(({ check, judged }) => ({
          slug: check.slug, name: check.name, state: judged.state, failed: judged.failed, runs: judged.since.length, verifiedAt: judged.verifiedAt,
        })),
    })).sort((a, b) => a.case.localeCompare(b.case))
    const judgements = cases.flatMap((item) => item.checks)
    const allVerified = judgements.length > 0 && judgements.every((item) => item.state === 'verified')
    const verifiedAt = allVerified ? judgements.map((item) => item.verifiedAt ?? '').sort().at(-1) ?? null : null
    const first = [...links].sort((a, b) => a.at.localeCompare(b.at))[0]
    return {
      url,
      firstAt: first.at,
      by: first.by,
      section: !allVerified ? 'open'
        : input.now.getTime() - new Date(verifiedAt ?? 0).getTime() <= RECENT_DAYS * DAY ? 'recent' : 'earlier',
      verifiedAt,
      cases: cases.map((item) => ({ ...item, checks: item.checks.map(({ verifiedAt: _, ...rest }) => rest) })),
    }
  })
  const order = { open: 0, recent: 1, earlier: 2 }
  return tickets.sort((a, b) => order[a.section] - order[b.section] || b.firstAt.localeCompare(a.firstAt))
}
