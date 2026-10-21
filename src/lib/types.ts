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
  // null: the check is run on demand and is never late.
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
  viewingLatest: boolean
  result: CaseResult | null
  history: CaseHistoryItem[]
}
