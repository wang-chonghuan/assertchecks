// View models shared by server functions and pages. Timestamps are ISO strings in UTC.
import type { CaseResult, CaseStatus, Outcome, Trigger, Versions } from '../server/judge'
import type { CheckStatus } from '../server/status'
import type { CaseMeta } from './organize'

export type { CaseResult, CaseStatus, Outcome, ThenResult, ThenStatus, Trigger, Versions } from '../server/judge'
export type { CheckStatus } from '../server/status'

export interface Me {
  email: string
  projects: { slug: string; name: string }[]
  // The last opened project, only when the user still belongs to it.
  lastProject: string | null
}

export interface RunRow {
  id: string
  startedAt: string
  finishedAt: string | null
  outcome: Outcome
  timedOut: boolean
  reason: string | null
  exitCode: number | null
  testSha: string | null
  trigger: Trigger
}

export interface PartialRun extends RunRow {
  caseCount: number
}

export interface CheckCard {
  slug: string
  name: string
  environment: string
  // null: the check has no schedule and is never late.
  periodSeconds: number | null
  graceSeconds: number
  status: CheckStatus
  nextExpectedAt: string | null
  // The latest finished run, and a newer run that has started but not reported.
  latest: RunRow | null
  active: RunRow | null
  // A named-case run that finished after the latest full run.
  partial: PartialRun | null
  // Cases of the latest full run that did not pass, in run order; empty when all passed.
  notPassed: CaseResult[]
  // Catalog cases the check's selection leaves out (draft or manual, never retired), with the
  // catalog's own explanation when it gives one.
  outsideRun: OutsideCase[]
  // Case counts of the latest full run and its catalog; null before the first finished run.
  counts: CaseCounts | null
  // Required cases of the previous full run that the latest full run's catalog removed or moved out
  // of the check's selection; empty when nothing was dropped.
  catalogChanges: CatalogChange[]
}

export interface CatalogChange {
  case: string
  title: string
  // removed: no longer in the catalog. moved: still there, but no longer required.
  change: 'removed' | 'moved'
  // For moved: the new status and/or run that left the check's selection; null when unchanged.
  status: string | null
  run: string | null
}

export interface CaseCounts {
  total: number
  passed: number
  failed: number
  // Selected cases that ran but did not finish: interrupted, skipped, flaky or missing from the report.
  notRun: number
  draft: number
  manual: number
}

export interface OutsideCase {
  case: string
  title: string
  status: string
  run: string
  note: string | null
}

export interface Overview {
  project: { slug: string; name: string }
  checks: CheckCard[]
}

export interface LatestRun extends RunRow {
  // A named-case run: how many cases it named; null for a full run.
  caseCount: number | null
  runnerKind: string | null
  runUrl: string | null
  deployedStart: Versions | null
  deployedEnd: Versions | null
  summary: CaseResult[] | null
}

// One stored run of a check, newest first, so older and flaky failures stay findable.
export interface RunHistoryItem extends RunRow {
  // A named-case run: how many cases it named; null for a full run.
  caseCount: number | null
  // Cases that ran and how they ended; null when the run reported no results.
  tally: { ran: number; passed: number; failed: number; incomplete: number } | null
  deployed: Versions | null
}

export interface CheckDetail {
  project: { slug: string; name: string }
  check: CheckCard
  // The run shown: the latest full run, or an older run picked from the history.
  latest: LatestRun | null
  viewingLatest: boolean
  history: RunHistoryItem[]
  // Group and tags of every case in the latest full run's catalog, keyed by case ID.
  caseMeta: Record<string, CaseMeta>
  // Tickets of every case that has one, judged on this check, keyed by case ID.
  tickets: Record<string, CaseTickets>
}

export interface CaseSpec {
  id: string
  title: string
  // A project's own field (for example ui / api), not part of the AssertChecks catalog format.
  type?: string
  run: string
  status: string
  failure?: string
  // Optional organizing fields: one free-form group, and comma-separated tags kept as a string.
  group?: string
  tags?: string
  given: string[]
  when: string[]
  then: { id: string; expect: string }[]
}

// What a coding agent needs to file bug tickets from a check's recent full runs: every case that did
// not pass in any of them, with its written spec and the details of its latest failure.
export interface BugReport {
  project: { slug: string; name: string }
  check: { slug: string; name: string; environment: string }
  runs: { id: string; startedAt: string; trigger: Trigger; testSha: string | null; deployed: Versions | null }[]
  cases: {
    spec: CaseSpec
    // Runs (newest first) in which the case did not pass, and its state in the newest run.
    notPassedIn: string[]
    ranIn: number
    newest: 'passed' | 'not passed' | 'not in run'
    last: { runId: string; result: CaseResult }
    tickets: CaseTickets
  }[]
}

// This case's result in one stored run; status is null when the run did not include the case.
export interface CaseHistoryItem {
  run: RunRow
  caseCount: number | null
  status: CaseStatus | null
  failed: boolean
}

export interface CaseDetail {
  project: { slug: string; name: string }
  check: { slug: string; name: string }
  spec: CaseSpec
  run: RunRow
  deployed: Versions | null
  viewingLatest: boolean
  result: CaseResult | null
  history: CaseHistoryItem[]
  tickets: CaseTickets
}

// Production errors (ASSERT-36). A problem is one kind of failure across many requests or page visits;
// counts are failures (requests, page visits or slow hours), not raw records.
export type ProblemKind = 'error' | 'slow'
export type ProblemGroup = 'triage' | 'ticket' | 'quiet' | 'ignored'
export type NoiseCategory = 'client' | 'scanner' | 'aborted' | 'analytics' | 'script'

// A ticket attached to a case or a problem. A subject keeps every ticket it ever had; none replaces another.
export interface TicketLink { id: string; url: string; by: string; at: string }
export interface ProblemIgnored { reason: string; by: string; at: string }

export interface ProblemView {
  id: string
  kind: ProblemKind
  // The ProblemId, or the operation name of a slow operation.
  key: string
  group: ProblemGroup
  isNew: boolean
  firstSeen: string
  lastSeen: string
  count24h: number
  count7d: number
  // Everything the workspace still holds (90 days).
  count90d: number
  // Marked Not handling, with why; otherwise null.
  ignored: ProblemIgnored | null
  // Newest first.
  tickets: TicketLink[]
  // With a ticket: failures since the newest was attached; quietDays when none occurred since then.
  sinceTicket: { count: number; quietDays: number | null } | null
  // Other problems that showed up in the same period, by key.
  together: string[]
  place: string | null
  role: string | null
  browser: boolean
  // Distinct messages with ids and numbers masked, most frequent first.
  variants: { template: string; count: number; lastAt: string }[]
  latest: { at: string; type: string | null; message: string; stack: string | null } | null
  // A slow operation's latest slow hour.
  slow: { p95Ms: number; usualMs: number } | null
}

export interface ProductionErrors {
  project: { slug: string; name: string }
  state: 'not-connected' | 'unavailable' | 'ready'
  // Why the telemetry could not be read; never shown as zero.
  error: string | null
  checkedAt: string
  portalUrl: string | null
  headline: { triage: number; isNew: number; ticket: number; stillOccurring: number; last24h: number; previous24h: number }
  // The last 30 UTC days, oldest first: failures of problems that are not marked Not handling.
  daily: { day: string; count: number }[]
  problems: ProblemView[]
  // The last 7 days of what is never a problem.
  noise: { category: NoiseCategory; total: number; items: { item: string; count: number }[] }[]
}

// A case's tickets judged on one check (ASSERT-37). From the runs of that check that included the case
// after the ticket was attached: none yet (waiting), the newest did not pass (failing), the newest
// passed once (passing), or the two newest passed (verified, cap7's acceptance). Flaky is not passed.
export type TicketState = 'waiting' | 'failing' | 'passing' | 'verified'

export interface TicketOnCheck extends TicketLink {
  state: TicketState
  // Runs of this check that included the case since the ticket was attached, oldest first.
  since: { runId: string; passed: boolean }[]
  failed: number
  // When the case became verified under this ticket.
  verifiedAt: string | null
}

export interface CaseTickets {
  // Newest first.
  tickets: TicketOnCheck[]
  // The case fails now after one of its tickets had been verified.
  recurred: boolean
}

// The project's tickets on cases, each with its cases and their state on every check.
export interface ProjectTicket {
  url: string
  firstAt: string
  by: string
  // open: some case is not verified on some check; recent: all verified within 14 days; earlier: before.
  section: 'open' | 'recent' | 'earlier'
  verifiedAt: string | null
  cases: { case: string; title: string; checks: { slug: string; name: string; state: TicketState; failed: number; runs: number }[] }[]
}

export interface ProjectTickets {
  project: { slug: string; name: string }
  tickets: ProjectTicket[]
}
