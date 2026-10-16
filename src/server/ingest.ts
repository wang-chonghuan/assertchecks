import { sql } from './db'
import { hashToken } from './crypto'
import { containsSensitive, judge, type Deployed } from './judge'

export const MAX_BODY_BYTES = 5 * 1024 * 1024

type Reply = { status: number; body: Record<string, unknown> }

const fail = (status: number, error: string): Reply => ({ status, body: { error } })

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > 2048) throw new Error(`${field} must be a string`)
  return value
}

function deployed(value: unknown, field: string): Deployed | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object') throw new Error(`${field} must be an object`)
  const record = value as Record<string, unknown>
  return { web: optionalString(record.web, `${field}.web`), api: optionalString(record.api, `${field}.api`) }
}

async function findCheck(token: string): Promise<{ id: string } | null> {
  const [check] = await sql()<{ id: string }[]>`
    SELECT id FROM checks WHERE ping_token_hash = ${hashToken(token)}
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
  let body: Record<string, unknown>
  let fields: { testSha: string | null; runnerKind: string | null; runUrl: string | null; start: Deployed | null }
  try {
    body = parseJson(text)
    const runner = (body.runner ?? {}) as Record<string, unknown>
    fields = {
      testSha: optionalString(body.testSha, 'testSha'),
      runnerKind: optionalString(runner.kind, 'runner.kind'),
      runUrl: optionalString(runner.runUrl, 'runner.runUrl'),
      start: deployed(body.deployed, 'deployed'),
    }
  } catch (error) {
    return fail(400, (error as Error).message)
  }
  const [run] = await sql()<{ id: string }[]>`
    INSERT INTO runs (check_id, started_at, outcome, test_sha, runner_kind, run_url, deployed_start)
    VALUES (${check.id}, now(), 'running', ${fields.testSha}, ${fields.runnerKind}, ${fields.runUrl},
            ${fields.start ? sql().json(fields.start as never) : null})
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
  let end: Deployed | null
  try {
    body = parseJson(text)
    runId = body.runId === undefined || body.runId === null ? null : String(body.runId)
    if (runId !== null && !/^\d+$/.test(runId)) throw new Error('runId must be an integer')
    if (!Number.isInteger(body.exitCode)) throw new Error('exitCode must be an integer')
    exitCode = body.exitCode as number
    testSha = optionalString(body.testSha, 'testSha')
    end = deployed(body.deployedEnd, 'deployedEnd')
    if (typeof body.report !== 'object' || body.report === null) throw new Error('report must be an object')
    if (typeof body.catalog !== 'object' || body.catalog === null) throw new Error('catalog must be an object')
  } catch (error) {
    return fail(400, (error as Error).message)
  }

  const db = sql()
  let start: Deployed | null = null
  if (runId !== null) {
    const [existing] = await db<{ outcome: string; deployed_start: Deployed | null }[]>`
      SELECT outcome, deployed_start FROM runs WHERE id = ${runId} AND check_id = ${check.id}
    `
    if (!existing) return fail(404, 'unknown run')
    if (existing.outcome !== 'running') return fail(409, 'run already finished')
    start = existing.deployed_start
  }

  // Reject the whole report rather than store a partially cleaned copy.
  const sensitive = containsSensitive(JSON.stringify(body.report))
  const verdict = sensitive
    ? { outcome: 'incomplete' as const, reason: 'Report rejected: it contains a suspected credential', summary: null }
    : judge({ report: body.report, catalog: body.catalog, exitCode, deployedStart: start, deployedEnd: end })

  const values = {
    outcome: verdict.outcome,
    reason: verdict.reason,
    exitCode,
    testSha,
    end: end ? db.json(end as never) : null,
    report: sensitive ? null : db.json(body.report as never),
    catalog: db.json(body.catalog as never),
    summary: verdict.summary ? db.json(verdict.summary as never) : null,
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
        INSERT INTO runs (check_id, started_at, finished_at, outcome, outcome_reason, exit_code, test_sha,
                          deployed_end, report, catalog, summary)
        VALUES (${check.id}, now(), now(), ${values.outcome}, ${values.reason}, ${values.exitCode}, ${values.testSha},
                ${values.end}, ${values.report}, ${values.catalog}, ${values.summary})
        RETURNING id
      `
  if (!run) return fail(409, 'run already finished')
  if (sensitive) return { status: 422, body: { runId: run.id, outcome: verdict.outcome, error: verdict.reason } }
  return { status: 200, body: { runId: run.id, outcome: verdict.outcome } }
}
