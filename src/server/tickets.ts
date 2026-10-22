// What a person asks about a bug, answered from run results (ASSERT-37): does it need a ticket, is a
// ticket on it, is it fixed. A bug is a failing case of the project, whatever environment it fails in.
// Nothing here reads the database, so every rule is unit-tested.
import type { Bug, BugStatus, TicketLink } from '../lib/types'

const DAY = 24 * 60 * 60 * 1000
// Fixed bugs stay in the list this long.
const RECENT_DAYS = 14

// One run of a check that included the case.
export interface CaseRun { runId: string; finishedAt: Date; passed: boolean }

const byTime = (runs: CaseRun[]) => [...runs].sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime())

// How long the passes at the end of these runs go on, and when that streak reached two runs.
function tailPasses(runs: CaseRun[]): { length: number; secondAt: Date | null } {
  let start = runs.length
  while (start > 0 && runs[start - 1].passed) start--
  const length = runs.length - start
  return { length, secondAt: length >= 2 ? runs[start + 1].finishedAt : null }
}

// Two passes in a row anywhere in these runs.
const everFixed = (runs: CaseRun[]) => runs.some((run, index) => index > 0 && run.passed && runs[index - 1].passed)

// A case's state from its tickets and its runs on every check of the project. Null when it is not a
// bug: it passes everywhere and never had a ticket.
//   needs-ticket — it fails now and no ticket covers it, or it failed again after its ticket fixed it;
//   in-progress  — a ticket is on it and it is not fixed yet;
//   fixed        — since the newest ticket, every check that ran it passed it twice in a row.
export function caseStatus(links: TicketLink[], runsPerCheck: CaseRun[][]): Omit<Bug, 'case' | 'title' | 'check'> | null {
  const tickets = [...links].sort((a, b) => b.at.localeCompare(a.at))
  const checks = runsPerCheck.filter((runs) => runs.length > 0).map(byTime)
  const failingNow = checks.some((runs) => !runs.at(-1)!.passed)
  const newest = tickets[0]
  if (!newest) return failingNow ? { status: 'needs-ticket', tickets, previous: null, fixedAt: null } : null
  const since = checks.map((runs) => runs.filter((run) => run.finishedAt.getTime() > new Date(newest.at).getTime()))
    .filter((runs) => runs.length > 0)
  if (failingNow) {
    const again = since.some((runs) => !runs.at(-1)!.passed && everFixed(runs.slice(0, -1)))
    return again
      ? { status: 'needs-ticket', tickets, previous: newest.url, fixedAt: null }
      : { status: 'in-progress', tickets, previous: null, fixedAt: null }
  }
  const streaks = since.map(tailPasses)
  if (streaks.length === 0 || streaks.some((streak) => streak.length < 2)) {
    return { status: 'in-progress', tickets, previous: null, fixedAt: null }
  }
  const fixedAt = streaks.map((streak) => streak.secondAt!.toISOString()).sort().at(-1)!
  return { status: 'fixed', tickets, previous: null, fixedAt }
}

const ORDER: Record<BugStatus, number> = { 'needs-ticket': 0, 'in-progress': 1, fixed: 2 }

// The project's bugs: those that need a ticket first, then those in progress, then those fixed in the
// last two weeks. Older fixed bugs leave the list.
export function projectBugs(bugs: Bug[], now: Date): Bug[] {
  return bugs
    .filter((bug) => bug.status !== 'fixed' || now.getTime() - new Date(bug.fixedAt!).getTime() <= RECENT_DAYS * DAY)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.case.localeCompare(b.case))
}
