// View models shared by server functions and pages. Timestamps are ISO strings in UTC.
import type { CaseResult, Outcome, Trigger, Versions } from '../server/judge'
import type { CheckStatus } from '../server/status'

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
}

export interface CaseCounts {
  total: number
  passed: number
  failed: number
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
  runnerKind: string | null
  runUrl: string | null
  deployedStart: Versions | null
  deployedEnd: Versions | null
  summary: CaseResult[] | null
}

export interface CheckDetail {
  project: { slug: string; name: string }
  check: CheckCard
  latest: LatestRun | null
}

export interface CaseSpec {
  id: string
  title: string
  // A project's own field (for example ui / api), not part of the AssertChecks catalog format.
  type?: string
  run: string
  status: string
  failure?: string
  given: string[]
  when: string[]
  then: { id: string; expect: string }[]
}

export interface CaseDetail {
  project: { slug: string; name: string }
  check: { slug: string; name: string }
  spec: CaseSpec
  run: RunRow
  result: CaseResult | null
}
