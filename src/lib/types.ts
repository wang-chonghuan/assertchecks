// View models shared by server functions and pages. Timestamps are ISO strings in UTC.
import type { CaseResult, Outcome } from '../server/judge'
import type { CheckStatus } from '../server/status'

export type { CaseResult, CaseStatus, Outcome, ThenResult, ThenStatus } from '../server/judge'
export type { CheckStatus } from '../server/status'

export interface Me {
  email: string
  projects: { slug: string; name: string }[]
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
}

export interface CheckCard {
  slug: string
  name: string
  environment: string
  periodSeconds: number
  graceSeconds: number
  status: CheckStatus
  nextExpectedAt: string | null
  // The latest finished run, and a newer run that has started but not reported.
  latest: RunRow | null
  active: RunRow | null
}

export interface Overview {
  project: { slug: string; name: string }
  checks: CheckCard[]
}

export interface Deployed {
  web: string | null
  api: string | null
}

export interface LatestRun extends RunRow {
  runnerKind: string | null
  runUrl: string | null
  deployedStart: Deployed | null
  deployedEnd: Deployed | null
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
  type: string
  run: string
  status: string
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
