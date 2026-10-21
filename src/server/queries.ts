// Read model. Every query is scoped to the signed-in user's memberships; a miss is null (rendered as 404).
// Cards show each check's latest finished full run; the check and case pages can also open an older run
// from the run history, so failures that come and go stay traceable.
import { sql } from './db'
import { checkStatus, runTimedOut } from './status'
import { catalogChanges } from './catalog-changes'
import { caseMeta, type CaseMeta } from '../lib/organize'
import type { CaseResult, Outcome, Selection, Trigger, Versions } from './judge'
import type {
  BugReport, CaseCounts, CaseDetail, CaseHistoryItem, CaseSpec, CheckCard, CheckDetail, LatestRun, Me, OutsideCase, Overview,
  PartialRun, RunHistoryItem, RunRow,
} from '../lib/types'

// How many stored runs the history lists, newest first.
const HISTORY_RUNS = 50
// How many recent full runs a bug report gathers failures from.
const REPORT_RUNS = 10

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
  cases: string[] | null
}

// What the pages read from a stored catalog: each case's identity, status and organizing fields, not its
// Given/When/Then, which make up most of a catalog. Built in the database so only this crosses the wire;
// the case page reads its one full case separately.
const slimCatalog = () => sql()`CASE WHEN jsonb_typeof(catalog->'cases') = 'array' THEN jsonb_build_object('cases', (
  SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', c->'id', 'title', c->'title', 'status', c->'status', 'run', c->'run',
    'failure', c->'failure', 'group', c->'group', 'tags', c->'tags')) ORDER BY i), '[]'::jsonb)
  FROM jsonb_array_elements(catalog->'cases') WITH ORDINALITY AS x(c, i))) END`

// A run's results without error text, enough to count passes and failures.
const slimSummary = () => sql()`CASE WHEN jsonb_typeof(summary) = 'array' THEN (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('case', s->'case', 'status', s->'status', 'thens', s->'thens') ORDER BY i), '[]'::jsonb)
  FROM jsonb_array_elements(summary) WITH ORDINALITY AS x(s, i)) END`

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
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, runner_kind, run_url, deployed_start, deployed_end, summary, ${slimCatalog()} AS catalog, cases
    FROM runs WHERE check_id = ${checkId} AND finished_at IS NOT NULL AND cases IS NULL
    ORDER BY finished_at DESC, id DESC LIMIT 1
  `
  return row ?? null
}

// A finished run of this check picked from the history: full or named-case.
async function finishedRun(checkId: string, runId: string): Promise<LatestDbRow | null> {
  const [row] = await sql()<LatestDbRow[]>`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, runner_kind, run_url, deployed_start, deployed_end, summary, ${slimCatalog()} AS catalog, cases
    FROM runs WHERE check_id = ${checkId} AND id = ${runId} AND finished_at IS NOT NULL
  `
  return row ?? null
}

// The newest runs of a check, any kind, with what each needs for one history row.
async function recentRuns(checkId: string): Promise<(RunDbRow & {
  cases: string[] | null; summary: CaseResult[] | null; deployed_start: Versions | null; deployed_end: Versions | null
})[]> {
  return sql()`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, cases,
           ${slimSummary()} AS summary, deployed_start, deployed_end
    FROM runs WHERE check_id = ${checkId}
    ORDER BY started_at DESC, id DESC LIMIT ${HISTORY_RUNS}
  `
}

// The newest runs of a check with one case's result in each; null where the run did not include it.
async function caseRuns(checkId: string, caseId: string): Promise<(RunDbRow & {
  cases: string[] | null; result: CaseResult | null
})[]> {
  return sql()`
    SELECT id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, cases,
           jsonb_path_query_first(summary, '$[*] ? (@.case == $id)', jsonb_build_object('id', ${caseId}::text)) AS result
    FROM runs WHERE check_id = ${checkId}
    ORDER BY started_at DESC, id DESC LIMIT ${HISTORY_RUNS}
  `
}

// A case failed when it failed or any of its Thens failed; it is incomplete when it neither passed nor
// failed (cut off, skipped, flaky, or a Then missing from the report).
function caseFailed(item: CaseResult): boolean {
  return item.status === 'failed' || item.thens.some((then) => then.status === 'failed')
}

function casePassed(item: CaseResult): boolean {
  return item.status === 'passed' && item.thens.every((then) => then.status === 'passed')
}

function tally(summary: CaseResult[] | null): RunHistoryItem['tally'] {
  if (!summary) return null
  const failed = summary.filter(caseFailed).length
  const passed = summary.filter(casePassed).length
  return { ran: summary.length, passed, failed, incomplete: summary.length - passed - failed }
}

// The catalog of the full run before the latest one, to show required cases the latest dropped.
// Runs without a catalog (reported errors) are skipped.
async function previousCatalog(checkId: string, latest: LatestDbRow): Promise<unknown> {
  const [row] = await sql()<{ catalog: unknown }[]>`
    SELECT ${slimCatalog()} AS catalog FROM runs
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
    .filter((item) => !casePassed(item))
    .map((item) => ({ ...item, title: specs.get(item.case)?.title ?? item.title }))
}

// Catalog cases this check never runs automatically, so their absence is visible rather than silent.
function outsideRun(latest: LatestDbRow | null, selection: Selection): OutsideCase[] {
  // A named-case run chose its cases by name; the rest of the catalog was never meant to run.
  if (!latest || latest.cases) return []
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

// Every non-retired catalog case falls in exactly one bucket: passed, failed, not run, draft or manual.
function counts(latest: LatestDbRow, notPassedCases: CaseResult[], outside: OutsideCase[]): CaseCounts {
  const ran = latest.summary?.length ?? 0
  const draft = outside.filter((item) => item.status === 'draft').length
  const failed = notPassedCases.filter(caseFailed).length
  return {
    total: ran + outside.length,
    passed: ran - notPassedCases.length,
    failed,
    notRun: notPassedCases.length - failed,
    draft,
    manual: outside.length - draft,
  }
}

function catalogCases(latest: LatestDbRow): Map<string, CaseSpec> {
  const cases = Array.isArray(latest.catalog?.cases) ? latest.catalog.cases : []
  return new Map(cases.map((item) => [item.id, item]))
}

async function card(check: CheckRow, now: Date, chosen?: LatestDbRow): Promise<{ card: CheckCard; latest: LatestDbRow | null }> {
  const latest = chosen ?? await latestFinished(check.id)
  // The check's status always comes from its newest full run, also while an older run is shown.
  const newest = chosen ? await latestFinished(check.id) : latest
  // The rest depends only on the run shown, so it is read in parallel. Notices about newer runs
  // belong to the latest view only.
  const [active, partial, scheduled, previous] = await Promise.all([
    chosen ? null : activeRun(check.id, latest?.started_at ?? null),
    chosen ? null : latestPartial(check.id, latest?.finished_at ?? null),
    latestScheduled(check.id),
    latest && !latest.cases ? previousCatalog(check.id, latest) : null,
  ])
  const derived = checkStatus({
    now,
    createdAt: check.created_at,
    periodSeconds: check.period_seconds,
    graceSeconds: check.grace_seconds,
    latestFull: newest ? { outcome: newest.outcome } : null,
    latestScheduled: scheduled ? { finishedAt: scheduled } : null,
  })
  const failed = notPassed(latest)
  const outside = outsideRun(latest, check.selection)
  const changes = latest && !latest.cases ? catalogChanges(previous, latest.catalog, check.selection) : []
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

export async function checkDetail(
  userId: string, projectSlug: string, checkSlug: string, runId?: string,
): Promise<CheckDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const now = new Date()
  const chosen = runId ? await finishedRun(check.id, runId) : undefined
  if (chosen === null) return null
  const { card: checkCard, latest } = await card(check, now, chosen)
  let latestRun: LatestRun | null = null
  const meta: Record<string, CaseMeta> = {}
  if (latest) {
    for (const [id, spec] of catalogCases(latest)) meta[id] = caseMeta(spec)
    const specs = catalogCases(latest)
    latestRun = {
      ...toRun(latest, check.grace_seconds, now),
      caseCount: latest.cases?.length ?? null,
      runnerKind: latest.runner_kind,
      runUrl: latest.run_url,
      deployedStart: latest.deployed_start,
      deployedEnd: latest.deployed_end,
      // Case titles come from the run's own catalog, not from the test title the runner reported.
      summary: latest.summary?.map((item) => ({ ...item, title: specs.get(item.case)?.title ?? item.title })) ?? null,
    }
  }
  const runs = await recentRuns(check.id)
  const history: RunHistoryItem[] = runs.map((row) => ({
    ...toRun(row, check.grace_seconds, now),
    caseCount: row.cases?.length ?? null,
    tally: tally(row.summary),
    deployed: row.deployed_start ?? row.deployed_end,
  }))
  return {
    project: { slug: found.slug, name: found.name },
    check: checkCard,
    latest: latestRun,
    viewingLatest: !chosen,
    history,
    caseMeta: meta,
  }
}

export async function caseDetail(
  userId: string, projectSlug: string, checkSlug: string, caseId: string, runId?: string,
): Promise<CaseDetail | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const latest = runId ? await finishedRun(check.id, runId) : await latestFinished(check.id)
  if (!latest) return null
  const [[stored], runs] = await Promise.all([
    sql()<{ spec: CaseSpec | null }[]>`
      SELECT jsonb_path_query_first(catalog, '$.cases[*] ? (@.id == $id)', jsonb_build_object('id', ${caseId}::text)) AS spec
      FROM runs WHERE id = ${latest.id}
    `,
    caseRuns(check.id, caseId),
  ])
  const spec = stored?.spec
  if (!spec) return null
  const now = new Date()
  // Finished runs only: one still running has no result for the case yet.
  const history: CaseHistoryItem[] = runs
    .filter((row) => row.finished_at !== null)
    .map((row) => {
      const result = row.result
      return {
        run: toRun(row, check.grace_seconds, now),
        caseCount: row.cases?.length ?? null,
        status: result?.status ?? null,
        failed: result ? caseFailed(result) : false,
      }
    })
  return {
    project: { slug: found.slug, name: found.name },
    check: { slug: check.slug, name: check.name },
    spec,
    run: toRun(latest, check.grace_seconds, now),
    deployed: latest.deployed_start ?? latest.deployed_end,
    viewingLatest: !runId,
    result: latest.summary?.find((item) => item.case === caseId) ?? null,
    history,
  }
}

// Every case that did not pass in any of the check's recent full runs, with its spec from the newest
// run's catalog and its most recent failing result, so one copy covers defects that come and go.
export async function bugReport(userId: string, projectSlug: string, checkSlug: string): Promise<BugReport | null> {
  const found = await project(userId, projectSlug)
  if (!found) return null
  const check = await findCheck(found.id, checkSlug)
  if (!check) return null
  const runs = await sql()<{
    id: string; started_at: Date; trigger: Trigger; test_sha: string | null
    deployed_start: Versions | null; deployed_end: Versions | null; summary: CaseResult[] | null
  }[]>`
    SELECT id, started_at, trigger, test_sha, deployed_start, deployed_end, summary FROM runs
    WHERE check_id = ${check.id} AND finished_at IS NOT NULL AND cases IS NULL AND summary IS NOT NULL
    ORDER BY finished_at DESC, id DESC LIMIT ${REPORT_RUNS}
  `
  const ids = [...new Set(runs.flatMap((run) => (run.summary ?? []).filter((item) => !casePassed(item)).map((item) => item.case)))]
  const specs = runs.length && ids.length ? await sql()<{ spec: CaseSpec }[]>`
    SELECT c AS spec FROM runs, jsonb_array_elements(CASE WHEN jsonb_typeof(catalog->'cases') = 'array' THEN catalog->'cases' ELSE '[]'::jsonb END) c
    WHERE id = ${runs[0].id} AND c->>'id' = ANY(${ids})
  ` : []
  const specOf = new Map(specs.map((row) => [row.spec.id, row.spec]))
  const cases = ids.flatMap((id): BugReport['cases'] => {
    const results = runs.map((run) => ({ runId: run.id, result: run.summary?.find((item) => item.case === id) ?? null }))
    const notPassed = results.filter((item) => item.result && !casePassed(item.result))
    // A case the newest catalog no longer has gives no spec to file from.
    const spec = specOf.get(id)
    if (!spec || !notPassed.length) return []
    const newest = results[0].result
    return [{
      spec,
      notPassedIn: notPassed.map((item) => item.runId),
      ranIn: results.filter((item) => item.result).length,
      newest: !newest ? 'not in run' : casePassed(newest) ? 'passed' : 'not passed',
      last: { runId: notPassed[0].runId, result: notPassed[0].result! },
    }]
  }).sort((a, b) => a.spec.id.localeCompare(b.spec.id))
  return {
    project: { slug: found.slug, name: found.name },
    check: { slug: check.slug, name: check.name, environment: check.environment },
    runs: runs.map((run) => ({
      id: run.id, startedAt: run.started_at.toISOString(), trigger: run.trigger, testSha: run.test_sha,
      deployed: run.deployed_start ?? run.deployed_end,
    })),
    cases,
  }
}
