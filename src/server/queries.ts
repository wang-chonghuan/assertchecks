// Read model. Every query is scoped to the signed-in user's memberships; a miss is null (rendered as 404).
// Only each check's latest finished run is shown; older runs stay stored but are never read here.
import { sql } from './db'
import { checkStatus, runTimedOut } from './status'
import type { CaseResult, Outcome } from './judge'
import type { CaseDetail, CaseSpec, CheckCard, CheckDetail, Deployed, LatestRun, Me, Overview, RunRow } from '../lib/types'

interface ProjectRow { id: string; slug: string; name: string }
interface CheckRow {
  id: string; slug: string; name: string; environment: string; period_seconds: number; grace_seconds: number
}
interface RunDbRow {
  id: string; started_at: Date; finished_at: Date | null; outcome: Outcome; outcome_reason: string | null
  exit_code: number | null; test_sha: string | null
}
interface LatestDbRow extends RunDbRow {
  runner_kind: string | null; run_url: string | null; deployed_start: Deployed | null
  deployed_end: Deployed | null; summary: CaseResult[] | null; catalog: { cases?: CaseSpec[] } | null
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

async function findCheck(projectId: string, slug: string): Promise<CheckRow | null> {
  const [row] = await sql()<CheckRow[]>`
    SELECT id, slug, name, environment, period_seconds, grace_seconds FROM checks
    WHERE project_id = ${projectId} AND slug = ${slug}
  `
  return row ?? null
}

async function latestFinished(checkId: string): Promise<LatestDbRow | null> {
  const [row] = await sql()<LatestDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, runner_kind, run_url, deployed_start, deployed_end, summary, catalog
    FROM runs WHERE check_id = ${checkId} AND finished_at IS NOT NULL
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

// A run that started after the latest finished one and has not reported yet.
async function activeRun(checkId: string, after: Date | null): Promise<RunDbRow | null> {
  const [row] = await sql()<RunDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha FROM runs
    WHERE check_id = ${checkId} AND outcome = 'running'
      AND (${after}::timestamptz IS NULL OR started_at > ${after})
    ORDER BY started_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

function catalogCases(latest: LatestDbRow): Map<string, CaseSpec> {
  const cases = Array.isArray(latest.catalog?.cases) ? latest.catalog.cases : []
  return new Map(cases.map((item) => [item.id, item]))
}

async function card(check: CheckRow, now: Date): Promise<{ card: CheckCard; latest: LatestDbRow | null }> {
  const latest = await latestFinished(check.id)
  const active = await activeRun(check.id, latest?.started_at ?? null)
  const derived = checkStatus({
    now,
    periodSeconds: check.period_seconds,
    graceSeconds: check.grace_seconds,
    lastFinished: latest?.finished_at ? { outcome: latest.outcome, finishedAt: latest.finished_at } : null,
  })
  return {
    latest,
    card: {
      slug: check.slug,
      name: check.name,
      environment: check.environment,
      periodSeconds: check.period_seconds,
      graceSeconds: check.grace_seconds,
      status: derived.status,
      nextExpectedAt: derived.nextExpectedAt?.toISOString() ?? null,
      latest: latest ? toRun(latest, check.grace_seconds, now) : null,
      active: active ? toRun(active, check.grace_seconds, now) : null,
    },
  }
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
  const cards = await Promise.all(checks.map((check) => card(check, now)))
  return { project: { slug: found.slug, name: found.name }, checks: cards.map((item) => item.card) }
}

export async function checkDetail(userId: string, projectSlug: string, checkSlug: string): Promise<CheckDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const now = new Date()
  const { card: checkCard, latest } = await card(check, now)
  let latestRun: LatestRun | null = null
  if (latest) {
    const specs = catalogCases(latest)
    latestRun = {
      ...toRun(latest, check.grace_seconds, now),
      runnerKind: latest.runner_kind,
      runUrl: latest.run_url,
      deployedStart: latest.deployed_start,
      deployedEnd: latest.deployed_end,
      // Case titles come from the run's own catalog, not from the test title the runner reported.
      summary: latest.summary?.map((item) => ({ ...item, title: specs.get(item.case)?.title ?? item.title })) ?? null,
    }
  }
  return { project: { slug: found.slug, name: found.name }, check: checkCard, latest: latestRun }
}

export async function caseDetail(
  userId: string, projectSlug: string, checkSlug: string, caseId: string,
): Promise<CaseDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const latest = await latestFinished(check.id)
  const spec = latest ? catalogCases(latest).get(caseId) : undefined
  if (!latest || !spec) return null
  return {
    project: { slug: found.slug, name: found.name },
    check: { slug: check.slug, name: check.name },
    spec,
    run: toRun(latest, check.grace_seconds, new Date()),
    result: latest.summary?.find((item) => item.case === caseId) ?? null,
  }
}
