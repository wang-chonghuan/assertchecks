// Read model. Every query is scoped to the signed-in user's memberships; a miss is null (rendered as 404).
import { sql } from './db'
import { checkStatus, runTimedOut } from './status'
import type { CaseResult, Outcome } from './judge'
import type {
  CaseDetail, CaseSpec, CheckCard, CheckDetail, Deployed, Me, Overview, RunDetail, RunRow,
} from '../lib/types'

const RECENT_RUNS = 30
const HISTORY_RUNS = 100

interface ProjectRow { id: string; slug: string; name: string }
interface CheckRow {
  id: string; slug: string; name: string; environment: string; period_seconds: number; grace_seconds: number
}
interface RunDbRow {
  id: string; started_at: Date; finished_at: Date | null; outcome: Outcome; outcome_reason: string | null
  exit_code: number | null; test_sha: string | null
}

function toRun(row: RunDbRow, graceSeconds: number, now: Date): RunRow {
  return {
    id: row.id,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    outcome: row.outcome,
    timedOut: runTimedOut({ now, startedAt: row.started_at, graceSeconds, outcome: row.outcome }),
    reason: row.outcome_reason,
    exitCode: row.exit_code,
    testSha: row.test_sha,
  }
}

async function project(userId: string, slug: string): Promise<ProjectRow | null> {
  const [row] = await sql()<ProjectRow[]>`
    SELECT p.id, p.slug, p.name FROM projects p JOIN memberships m ON m.project_id = p.id
    WHERE m.user_id = ${userId} AND p.slug = ${slug}
  `
  return row ?? null
}

async function recentRuns(checkId: string, limit: number): Promise<RunDbRow[]> {
  return sql()<RunDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha
    FROM runs WHERE check_id = ${checkId} ORDER BY started_at DESC, id DESC LIMIT ${limit}
  `
}

async function card(check: CheckRow, now: Date): Promise<CheckCard> {
  const rows = await recentRuns(check.id, RECENT_RUNS)
  const [lastFinished] = await sql()<{ outcome: string; finished_at: Date }[]>`
    SELECT outcome, finished_at FROM runs WHERE check_id = ${check.id} AND finished_at IS NOT NULL
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  const derived = checkStatus({
    now,
    periodSeconds: check.period_seconds,
    graceSeconds: check.grace_seconds,
    lastFinished: lastFinished ? { outcome: lastFinished.outcome, finishedAt: lastFinished.finished_at } : null,
  })
  const recent = rows.map((row) => toRun(row, check.grace_seconds, now))
  return {
    slug: check.slug,
    name: check.name,
    environment: check.environment,
    periodSeconds: check.period_seconds,
    graceSeconds: check.grace_seconds,
    status: derived.status,
    nextExpectedAt: derived.nextExpectedAt?.toISOString() ?? null,
    lastRun: recent[0] ?? null,
    recent,
  }
}

async function findCheck(projectId: string, slug: string): Promise<CheckRow | null> {
  const [row] = await sql()<CheckRow[]>`
    SELECT id, slug, name, environment, period_seconds, grace_seconds FROM checks
    WHERE project_id = ${projectId} AND slug = ${slug}
  `
  return row ?? null
}

export async function me(user: { id: string; email: string }): Promise<Me> {
  const projects = await sql()<{ slug: string; name: string }[]>`
    SELECT p.slug, p.name FROM projects p JOIN memberships m ON m.project_id = p.id
    WHERE m.user_id = ${user.id} ORDER BY p.name
  `
  return { email: user.email, projects: [...projects] }
}

export async function overview(userId: string, projectSlug: string): Promise<Overview | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const now = new Date()
  const checks = await sql()<CheckRow[]>`
    SELECT id, slug, name, environment, period_seconds, grace_seconds FROM checks
    WHERE project_id = ${found.id} ORDER BY name
  `
  return {
    project: { slug: found.slug, name: found.name },
    checks: await Promise.all(checks.map((check) => card(check, now))),
  }
}

export async function checkDetail(userId: string, projectSlug: string, checkSlug: string): Promise<CheckDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const now = new Date()
  const rows = await recentRuns(check.id, HISTORY_RUNS)
  const matrixRows = await sql()<{ id: string; started_at: Date; outcome: Outcome; summary: CaseResult[] | null }[]>`
    SELECT id, started_at, outcome, summary FROM runs
    WHERE check_id = ${check.id} AND finished_at IS NOT NULL
    ORDER BY started_at DESC, id DESC LIMIT ${RECENT_RUNS}
  `
  // Rows are the union of cases seen in the window, ordered by case ID.
  const titles = new Map<string, string>()
  for (const row of matrixRows) for (const item of row.summary ?? []) titles.set(item.case, item.title)
  return {
    project: { slug: found.slug, name: found.name },
    check: await card(check, now),
    runs: rows.map((row) => toRun(row, check.grace_seconds, now)),
    matrix: {
      cases: [...titles].sort(([a], [b]) => a.localeCompare(b)).map(([id, title]) => ({ id, title })),
      runs: [...matrixRows].reverse().map((row) => ({
        id: row.id,
        startedAt: row.started_at.toISOString(),
        outcome: row.outcome,
        cases: Object.fromEntries((row.summary ?? []).map((item) => [item.case, item.status])),
      })),
    },
  }
}

export async function runDetail(userId: string, projectSlug: string, runId: string): Promise<RunDetail | null> {
  if (!/^\d+$/.test(runId)) return null
  const found = await project(userId, projectSlug)
  if (!found) return null
  const [row] = await sql()<(RunDbRow & {
    check_slug: string; check_name: string; environment: string; grace_seconds: number
    runner_kind: string | null; run_url: string | null; deployed_start: Deployed | null
    deployed_end: Deployed | null; summary: CaseResult[] | null
  })[]>`
    SELECT r.id, r.started_at, r.finished_at, r.outcome, r.outcome_reason, r.exit_code, r.test_sha,
           r.runner_kind, r.run_url, r.deployed_start, r.deployed_end, r.summary,
           c.slug AS check_slug, c.name AS check_name, c.environment, c.grace_seconds
    FROM runs r JOIN checks c ON c.id = r.check_id
    WHERE r.id = ${runId} AND c.project_id = ${found.id}
  `
  if (!row) return null
  return {
    project: { slug: found.slug, name: found.name },
    check: { slug: row.check_slug, name: row.check_name, environment: row.environment },
    run: {
      ...toRun(row, row.grace_seconds, new Date()),
      runnerKind: row.runner_kind,
      runUrl: row.run_url,
      deployedStart: row.deployed_start,
      deployedEnd: row.deployed_end,
      summary: row.summary,
    },
  }
}

export async function caseDetail(
  userId: string, projectSlug: string, checkSlug: string, caseId: string,
): Promise<CaseDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const now = new Date()
  // The specification text comes from the newest stored catalog that declares the case.
  const [latest] = await sql()<{ id: string; spec: CaseSpec }[]>`
    SELECT r.id, item AS spec FROM runs r, jsonb_array_elements(r.catalog -> 'cases') item
    WHERE r.check_id = ${check.id} AND item ->> 'id' = ${caseId}
    ORDER BY r.started_at DESC, r.id DESC LIMIT 1
  `
  const rows = await sql()<(RunDbRow & { result: CaseResult | null })[]>`
    SELECT r.id, r.started_at, r.finished_at, r.outcome, r.outcome_reason, r.exit_code, r.test_sha,
           (SELECT item FROM jsonb_array_elements(r.summary) item WHERE item ->> 'case' = ${caseId}) AS result
    FROM runs r WHERE r.check_id = ${check.id} AND r.finished_at IS NOT NULL
    ORDER BY r.started_at DESC, r.id DESC LIMIT ${HISTORY_RUNS}
  `
  if (!latest && !rows.some((row) => row.result)) return null
  return {
    project: { slug: found.slug, name: found.name },
    check: { slug: check.slug, name: check.name },
    spec: latest?.spec ?? null,
    catalogRunId: latest?.id ?? null,
    history: rows.map((row) => ({ run: toRun(row, check.grace_seconds, now), result: row.result })),
  }
}
