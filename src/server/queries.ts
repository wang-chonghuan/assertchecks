// Read model. Every query is scoped to the signed-in user's memberships; a miss is null (rendered as 404).
// Only each check's latest finished run is shown; older runs stay stored but are never read here.
import { sql } from './db'
import { checkStatus, runTimedOut } from './status'
import { catalogChanges } from './catalog-changes'
import { caseMeta, type CaseMeta } from '../lib/organize'
import type { CaseResult, Outcome, Selection, Trigger, Versions } from './judge'
import type { CaseCounts, CaseDetail, CaseSpec, CheckCard, CheckDetail, LatestRun, Me, OutsideCase, Overview, PartialRun, RunRow } from '../lib/types'

interface ProjectRow { id: string; slug: string; name: string }
interface CheckRow {
  id: string; slug: string; name: string; environment: string; period_seconds: number | null; grace_seconds: number
  created_at: Date; selection: Selection
}
interface RunDbRow {
  id: string; started_at: Date; finished_at: Date | null; outcome: Outcome; outcome_reason: string | null
  exit_code: number | null; test_sha: string | null; trigger: Trigger
}
interface LatestDbRow extends RunDbRow {
  runner_kind: string | null; run_url: string | null; deployed_start: Versions | null
  deployed_end: Versions | null; summary: CaseResult[] | null; catalog: { cases?: CaseSpec[] } | null
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
    trigger: row.trigger,
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
    SELECT id, slug, name, environment, period_seconds, grace_seconds, created_at, selection FROM checks
    WHERE project_id = ${projectId} AND slug = ${slug}
  `
  return row ?? null
}

async function latestFinished(checkId: string): Promise<LatestDbRow | null> {
  const [row] = await sql()<LatestDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, runner_kind, run_url, deployed_start, deployed_end, summary, catalog
    FROM runs WHERE check_id = ${checkId} AND finished_at IS NOT NULL AND cases IS NULL
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

// The catalog of the full run before the latest one, to show required cases the latest dropped.
// Runs without a catalog (reported errors) are skipped.
async function previousCatalog(checkId: string, latest: LatestDbRow): Promise<unknown> {
  const [row] = await sql()<{ catalog: unknown }[]>`
    SELECT catalog FROM runs
    WHERE check_id = ${checkId} AND finished_at IS NOT NULL AND cases IS NULL AND catalog IS NOT NULL
      AND (finished_at, id) < (${latest.finished_at}, ${latest.id})
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row?.catalog ?? null
}

// Lateness is measured only from scheduled full runs.
async function latestScheduled(checkId: string): Promise<Date | null> {
  const [row] = await sql()<{ finished_at: Date }[]>`
    SELECT finished_at FROM runs
    WHERE check_id = ${checkId} AND finished_at IS NOT NULL AND cases IS NULL AND trigger = 'schedule'
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row?.finished_at ?? null
}

// A named-case run that finished after the displayed full run.
async function latestPartial(checkId: string, after: Date | null): Promise<(RunDbRow & { count: number }) | null> {
  const [row] = await sql()<(RunDbRow & { count: number })[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger,
           jsonb_array_length(cases) AS count
    FROM runs
    WHERE check_id = ${checkId} AND finished_at IS NOT NULL AND cases IS NOT NULL
      AND (${after}::timestamptz IS NULL OR finished_at > ${after})
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

// A run that started after the latest finished one and has not reported yet.
async function activeRun(checkId: string, after: Date | null): Promise<RunDbRow | null> {
  const [row] = await sql()<RunDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger FROM runs
    WHERE check_id = ${checkId} AND outcome = 'running'
      AND (${after}::timestamptz IS NULL OR started_at > ${after})
    ORDER BY started_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

// A case passes only when it passed and every declared Then passed.
function notPassed(latest: LatestDbRow | null): CaseResult[] {
  if (!latest?.summary) return []
  const specs = catalogCases(latest)
  return latest.summary
    .filter((item) => item.status !== 'passed' || item.thens.some((then) => then.status !== 'passed'))
    .map((item) => ({ ...item, title: specs.get(item.case)?.title ?? item.title }))
}

// Catalog cases this check never runs automatically, so their absence is visible rather than silent.
function outsideRun(latest: LatestDbRow | null, selection: Selection): OutsideCase[] {
  if (!latest) return []
  return [...catalogCases(latest).values()]
    .filter((item) => item.status !== 'retired' &&
      !(selection.status.includes(item.status) && selection.run.includes(item.run)))
    .map((item) => ({
      case: item.id,
      title: item.title,
      status: item.status,
      run: item.run,
      note: typeof item.failure === 'string' && item.failure ? item.failure : null,
    }))
}

// Every non-retired catalog case falls in exactly one bucket: passed, failed, draft or manual.
function counts(latest: LatestDbRow, failed: CaseResult[], outside: OutsideCase[]): CaseCounts {
  const ran = latest.summary?.length ?? 0
  const draft = outside.filter((item) => item.status === 'draft').length
  return { total: ran + outside.length, passed: ran - failed.length, failed: failed.length, draft, manual: outside.length - draft }
}

function catalogCases(latest: LatestDbRow): Map<string, CaseSpec> {
  const cases = Array.isArray(latest.catalog?.cases) ? latest.catalog.cases : []
  return new Map(cases.map((item) => [item.id, item]))
}

async function card(check: CheckRow, now: Date): Promise<{ card: CheckCard; latest: LatestDbRow | null }> {
  const latest = await latestFinished(check.id)
  const active = await activeRun(check.id, latest?.started_at ?? null)
  const partial = await latestPartial(check.id, latest?.finished_at ?? null)
  const scheduled = await latestScheduled(check.id)
  const derived = checkStatus({
    now,
    createdAt: check.created_at,
    periodSeconds: check.period_seconds,
    graceSeconds: check.grace_seconds,
    latestFull: latest ? { outcome: latest.outcome } : null,
    latestScheduled: scheduled ? { finishedAt: scheduled } : null,
  })
  const failed = notPassed(latest)
  const outside = outsideRun(latest, check.selection)
  const changes = latest ? catalogChanges(await previousCatalog(check.id, latest), latest.catalog, check.selection) : []
  const partialRun: PartialRun | null = partial
    ? { ...toRun(partial, check.grace_seconds, now), caseCount: partial.count }
    : null
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
      partial: partialRun,
      notPassed: failed,
      outsideRun: outside,
      counts: latest ? counts(latest, failed, outside) : null,
      catalogChanges: changes,
    },
  }
}

export async function me(user: { id: string | null; email: string }, remembered: string | null): Promise<Me> {
  const projects = user.id === null ? [] : await sql()<{ slug: string; name: string }[]>`
    SELECT p.slug, p.name FROM projects p JOIN memberships m ON m.project_id = p.id
    WHERE m.user_id = ${user.id} ORDER BY p.name
  `
  const lastProject = projects.some((project) => project.slug === remembered) ? remembered : null
  return { email: user.email, projects: [...projects], lastProject }
}

export async function overview(userId: string, projectSlug: string): Promise<Overview | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const now = new Date()
  const checks = await sql()<CheckRow[]>`
    SELECT id, slug, name, environment, period_seconds, grace_seconds, created_at, selection FROM checks
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
  const meta: Record<string, CaseMeta> = {}
  if (latest) {
    for (const [id, spec] of catalogCases(latest)) meta[id] = caseMeta(spec)
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
  return { project: { slug: found.slug, name: found.name }, check: checkCard, latest: latestRun, caseMeta: meta }
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
