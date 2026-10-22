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
  // Every case of the project that is a bug, keyed by case ID.
  bugs: Record<string, CaseBug>
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

// What a coding agent needs to file bug tickets from a check's latest full run: every case that did not
// pass in it, with its written expectation, its result and its tickets.
export interface BugReport {
  project: { slug: string; name: string }
  check: { slug: string; name: string; environment: string }
  // The newest finished full run with results; null before there is one.
  run: { id: string; startedAt: string; trigger: Trigger; testSha: string | null; deployed: Versions | null } | null
  cases: { spec: CaseSpec; result: CaseResult; bug: CaseBug | null }[]
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
  bug: CaseBug | null
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

// A bug is a failing case of the project, whatever environment it fails in (ASSERT-37). A person asks
// three things: does it need a ticket, is a ticket on it, is it fixed.
export type BugStatus = 'needs-ticket' | 'in-progress' | 'fixed'

export interface CaseBug {
  status: BugStatus
  // Newest first.
  tickets: TicketLink[]
  // The ticket whose fix did not hold, when the case failed again after it was fixed.
  previous: string | null
  // When it became fixed: passed twice in a row on every check that ran it since the newest ticket.
  fixedAt: string | null
}

export interface Bug extends CaseBug {
  case: string
  title: string
  // A check of the project to open the case on.
  check: string
}

export interface ProjectBugs {
  project: { slug: string; name: string }
  bugs: Bug[]
}

// A client sign-in request as its approval page shows it (ASSERT-38).
export interface ClientLogin {
  code: string
  requestedAt: string
  state: 'waiting' | 'approved' | 'expired'
}
