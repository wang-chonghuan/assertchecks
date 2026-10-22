import { sql } from './db'
import { hashToken } from './crypto'
import { containsSensitive, judge, type Selection, type Trigger, type Versions } from './judge'
import { catalogErrors, resultErrors } from './schema'
import { ticketUrl } from './ticket-links'

export const MAX_BODY_BYTES = 5 * 1024 * 1024

type Reply = { status: number; body: Record<string, unknown> }

const fail = (status: number, error: string): Reply => ({ status, body: { error } })

function optionalString(value: unknown, field: string, max = 2048): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} must be a string`)
  return value
}

function versions(value: unknown, field: string): Versions | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`)
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 20) throw new Error(`${field} has too many components`)
  return Object.fromEntries(entries.map(([name, sha]) => {
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(name)) throw new Error(`${field} has an invalid component name`)
    return [name, optionalString(sha, `${field}.${name}`, 200)]
  }))
}

function trigger(value: unknown): Trigger | null {
  if (value === undefined || value === null) return null
  if (value !== 'schedule' && value !== 'manual') throw new Error('trigger must be "schedule" or "manual"')
  return value
}

function namedCases(value: unknown): string[] | null {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000 ||
      value.some((id) => typeof id !== 'string' || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id)) ||
      new Set(value).size !== value.length) {
    throw new Error('cases must be a non-empty list of unique case IDs')
  }
  return value as string[]
}

async function findCheck(token: string): Promise<{ id: string; selection: Selection; project_id: string; slug: string } | null> {
  const [check] = await sql()<{ id: string; selection: Selection; project_id: string; slug: string }[]>`
    SELECT id, selection, project_id, slug FROM checks WHERE ping_token_hash = ${hashToken(token)}
  `
  return check ?? null
}

export async function readBody(request: Request): Promise<{ text: string } | Reply> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return fail(413, 'body exceeds 5 MB')
  const text = await request.text()
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return fail(413, 'body exceeds 5 MB')
  return { text }
}

function parseJson(text: string): Record<string, unknown> {
  const value = text.trim() ? JSON.parse(text) : {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('body must be a JSON object')
  return value as Record<string, unknown>
}

export async function startRun(token: string, text: string): Promise<Reply> {
  const check = await findCheck(token)
  if (!check) return fail(404, 'unknown token')
  let fields: {
    testSha: string | null; runnerKind: string | null; runUrl: string | null
    start: Versions | null; trigger: Trigger; cases: string[] | null
  }
  try {
    const body = parseJson(text)
    const runner = (body.runner ?? {}) as Record<string, unknown>
    fields = {
      testSha: optionalString(body.testSha, 'testSha'),
      runnerKind: optionalString(runner.kind, 'runner.kind'),
      runUrl: optionalString(runner.runUrl, 'runner.runUrl'),
      start: versions(body.deployed, 'deployed'),
      trigger: trigger(body.trigger) ?? 'manual',
      cases: namedCases(body.cases),
    }
  } catch (error) {
    return fail(400, (error as Error).message)
  }
  const db = sql()
  const [run] = await db<{ id: string }[]>`
    INSERT INTO runs (check_id, started_at, outcome, trigger, cases, test_sha, runner_kind, run_url, deployed_start)
    VALUES (${check.id}, now(), 'running', ${fields.trigger}, ${fields.cases ? db.json(fields.cases) : null},
            ${fields.testSha}, ${fields.runnerKind}, ${fields.runUrl},
            ${fields.start ? db.json(fields.start as never) : null})
    RETURNING id
  `
  return { status: 201, body: { runId: run.id } }
}

export async function reportRun(token: string, text: string): Promise<Reply> {
  const check = await findCheck(token)
  if (!check) return fail(404, 'unknown token')

  let body: Record<string, unknown>
  let runId: string | null
  let exitCode: number
  let testSha: string | null
  let end: Versions | null
  let producerError: string | null
  try {
    body = parseJson(text)
    runId = body.runId === undefined || body.runId === null ? null : String(body.runId)
    if (runId !== null && !/^\d+$/.test(runId)) throw new Error('runId must be an integer')
    if (!Number.isInteger(body.exitCode)) throw new Error('exitCode must be an integer')
    exitCode = body.exitCode as number
    testSha = optionalString(body.testSha, 'testSha')
    end = versions(body.deployedEnd, 'deployedEnd')
    // A runner that produced no result reports why instead; the run is recorded as incomplete.
    producerError = optionalString(body.error, 'error', 500)
    if (!producerError && (typeof body.result !== 'object' || body.result === null)) {
      throw new Error('result must be an object, or error must explain why there is none')
    }
    if (!producerError && (typeof body.catalog !== 'object' || body.catalog === null)) {
      throw new Error('catalog must be an object')
    }
  } catch (error) {
    return fail(400, (error as Error).message)
  }

  const db = sql()
  let start: Versions | null = null
  let runTrigger = trigger(body.trigger) ?? 'manual'
  let runCases: string[] | null = null
  try {
    runCases = namedCases(body.cases)
  } catch (error) {
    return fail(400, (error as Error).message)
  }
  if (runId !== null) {
    const [existing] = await db<{ outcome: string; deployed_start: Versions | null; trigger: string; cases: string[] | null }[]>`
      SELECT outcome, deployed_start, trigger, cases FROM runs WHERE id = ${runId} AND check_id = ${check.id}
    `
    if (!existing) return fail(404, 'unknown run')
    if (existing.outcome !== 'running') return fail(409, 'run already finished')
    start = existing.deployed_start
    // The run's identity was fixed at start.
    runTrigger = existing.trigger as typeof runTrigger
    runCases = existing.cases
  }

  // Reject the whole result rather than store a partially cleaned copy.
  const sensitive = !producerError && containsSensitive(JSON.stringify(body.result))
  // A report that does not match the published format is recorded as incomplete, naming the fields.
  const formatErrors = producerError || sensitive ? [] : [...catalogErrors(body.catalog), ...resultErrors(body.result)]
  const verdict = producerError
    ? { outcome: 'incomplete' as const, reason: `Runner reported no result: ${producerError}`, summary: null }
    : sensitive
      ? { outcome: 'incomplete' as const, reason: 'Report rejected: it contains a suspected credential', summary: null }
      : formatErrors.length
        ? { outcome: 'incomplete' as const, reason: `Report does not match the AssertChecks format: ${formatErrors.join('; ')}`, summary: null }
        : judge({
          result: body.result,
          catalog: body.catalog,
          exitCode,
          deployedStart: start,
          deployedEnd: end,
          selection: check.selection,
          cases: runCases,
        })

  const values = {
    outcome: verdict.outcome,
    reason: verdict.reason,
    exitCode,
    testSha,
    end: end ? db.json(end as never) : null,
    report: sensitive || producerError ? null : db.json(body.result as never),
    catalog: body.catalog ? db.json(body.catalog as never) : null,
    summary: verdict.summary ? db.json(verdict.summary as never) : null,
    cases: runCases ? db.json(runCases) : null,
  }
  const [run] = runId !== null
    ? await db<{ id: string }[]>`
        UPDATE runs SET finished_at = now(), outcome = ${values.outcome}, outcome_reason = ${values.reason},
          exit_code = ${values.exitCode}, test_sha = coalesce(${values.testSha}, test_sha),
          deployed_end = ${values.end}, report = ${values.report}, catalog = ${values.catalog}, summary = ${values.summary}
        WHERE id = ${runId} AND check_id = ${check.id} AND outcome = 'running'
        RETURNING id
      `
    : await db<{ id: string }[]>`
        INSERT INTO runs (check_id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha, trigger, cases,
                          deployed_end, report, catalog, summary)
        VALUES (${check.id}, now(), now(), ${values.outcome}, ${values.reason}, ${values.exitCode}, ${values.testSha},
                ${runTrigger}, ${values.cases}, ${values.end}, ${values.report}, ${values.catalog}, ${values.summary})
        RETURNING id
      `
  if (!run) return fail(409, 'run already finished')
  if (sensitive) return { status: 422, body: { runId: run.id, outcome: verdict.outcome, error: verdict.reason } }
  if (formatErrors.length) return { status: 200, body: { runId: run.id, outcome: verdict.outcome, errors: formatErrors } }
  return { status: 200, body: { runId: run.id, outcome: verdict.outcome } }
}

// A dry run: validates a catalog, and optionally a result, as a report would be, judges it against
// the check's selection, and records nothing.
export async function checkReport(token: string, text: string): Promise<Reply> {
  const check = await findCheck(token)
  if (!check) return fail(404, 'unknown token')
  let body: Record<string, unknown>
  let cases: string[] | null
  try {
    body = parseJson(text)
    cases = namedCases(body.cases)
    if (body.exitCode !== undefined && !Number.isInteger(body.exitCode)) throw new Error('exitCode must be an integer')
  } catch (error) {
    return fail(400, (error as Error).message)
  }
  const hasResult = body.result !== undefined && body.result !== null
  if (hasResult && containsSensitive(JSON.stringify(body.result))) {
    return { status: 200, body: { valid: false, errors: ['result: contains a suspected credential; it would be rejected'] } }
  }
  const errors = [...catalogErrors(body.catalog), ...(hasResult ? resultErrors(body.result) : [])]
  if (errors.length) return { status: 200, body: { valid: false, errors } }
  if (!hasResult) return { status: 200, body: { valid: true } }
  const verdict = judge({
    result: body.result,
    catalog: body.catalog,
    exitCode: (body.exitCode as number | undefined) ?? 0,
    deployedStart: null,
    deployedEnd: null,
    selection: check.selection,
    cases,
    skipVersions: true,
  })
  return { status: 200, body: { valid: true, outcome: verdict.outcome, reason: verdict.reason } }
}

// Record that a ticket covers some cases of this check's project, as cap7 does after filing it. The
// cases must be in the check's newest catalog, so a mistyped ID is refused instead of linked to nothing.
export async function linkCases(token: string, text: string): Promise<Reply> {
  const check = await findCheck(token)
  if (!check) return fail(404, 'unknown token')
  let cases: string[]
  let url: string
  try {
    const body = parseJson(text)
    const named = namedCases(body.cases)
    if (!named) throw new Error('cases must be a non-empty list of unique case IDs')
    cases = named
    url = ticketUrl(body.ticket)
  } catch (error) {
    return fail(400, (error as Error).message)
  }
  const [newest] = await sql()<{ ids: string[] | null }[]>`
    SELECT (SELECT array_agg(c->>'id') FROM jsonb_array_elements(catalog->'cases') c) AS ids FROM runs
    WHERE check_id = ${check.id} AND jsonb_typeof(catalog->'cases') = 'array'
    ORDER BY finished_at DESC NULLS LAST, id DESC LIMIT 1
  `
  const known = new Set(newest?.ids ?? [])
  const unknown = cases.filter((id) => !known.has(id))
  if (unknown.length) return fail(400, `not in this check's newest catalog: ${unknown.join(', ')}`)
  const added = await sql()<{ case_id: string }[]>`
    INSERT INTO ticket_links ${sql()(cases.map((id) => ({ project_id: check.project_id, case_id: id, url, attached_by: `client (check ${check.slug})` })),
      'project_id', 'case_id', 'url', 'attached_by')}
    ON CONFLICT DO NOTHING RETURNING case_id
  `
  const linked = added.map((row) => row.case_id)
  return { status: 200, body: { linked, already: cases.filter((id) => !linked.includes(id)) } }
}
