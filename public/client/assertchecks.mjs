#!/usr/bin/env node
// AssertChecks client: report one test run to AssertChecks. Zero dependencies, Node 20+.
// Served by AssertChecks at /client/assertchecks.mjs so it always matches the server.
//
//   node assertchecks.mjs start  [--trigger schedule|manual] [--cases ID,ID] [--version NAME=URL]...
//   node assertchecks.mjs report --run-id ID --exit-code N --playwright results.json --catalog e2e.json
//                                [--version NAME=URL]...
//   node assertchecks.mjs report --run-id ID --exit-code N --error "why there is no report"
//   node assertchecks.mjs check  --catalog e2e.json [--playwright results.json --exit-code N] [--cases ID,ID]
//   node assertchecks.mjs link   --cases ID,ID --ticket URL
//
// `check` is a dry run: it validates the catalog (and the result, when given) against the published
// formats at /schemas/ and shows how the check would judge it, without recording a run.
// `link` records that a ticket covers these cases of the check's project; AssertChecks then shows the
// ticket on the cases and judges it from later runs. The cases must be in the check's newest catalog.
//
// Environment: ASSERTCHECKS_PING_TOKEN (required, never printed), ASSERTCHECKS_ORIGIN (optional).
// `start` prints only the run ID. A version URL must return JSON with a 40-character `sha`; each read
// is tried up to three times (waiting 2 s, then 4 s) before it is recorded as unreadable.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

export const DEFAULT_ORIGIN = 'https://assertchecks.com'
const TIMEOUT_MS = 30_000
const SENSITIVE = [/\bAuthorization\b/, /Bearer\s/, /eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}/]

export function containsSensitive(text) {
  return SENSITIVE.some((pattern) => pattern.test(text))
}

// GitHub Actions identifies itself; anything else is a local run unless told otherwise.
export function runnerFromEnv(env) {
  if (env.GITHUB_ACTIONS === 'true') {
    return {
      kind: 'github-actions',
      runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
      trigger: env.GITHUB_EVENT_NAME === 'schedule' ? 'schedule' : 'manual',
    }
  }
  return { kind: 'local', runUrl: null, trigger: 'manual' }
}

function testSha(given, env) {
  if (given) return given
  if (env.GITHUB_SHA) return env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

// A transient network blip should not make a run incomplete, so each version read is retried.
export const VERSION_RETRY_DELAYS_MS = [2_000, 4_000]

async function readSha(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (typeof body.sha !== 'string' || !/^[0-9a-f]{40}$/.test(body.sha)) throw new Error('response has no 40-character sha')
  return body.sha
}

async function readVersions(specs, fetchImpl, log, sleep) {
  const versions = {}
  for (const spec of specs) {
    const at = spec.indexOf('=')
    if (at < 1) throw new Error(`--version must look like NAME=URL: ${spec}`)
    const name = spec.slice(0, at)
    const url = spec.slice(at + 1)
    versions[name] = null
    for (let attempt = 0; attempt <= VERSION_RETRY_DELAYS_MS.length; attempt++) {
      try {
        versions[name] = await readSha(url, fetchImpl)
        break
      } catch (error) {
        if (attempt < VERSION_RETRY_DELAYS_MS.length) {
          await sleep(VERSION_RETRY_DELAYS_MS[attempt])
        } else {
          // An unreadable version is sent as null; AssertChecks then refuses to call the run passed.
          log(`warning: could not read ${name} version after ${attempt + 1} attempts: ${error.message}`)
        }
      }
    }
  }
  return Object.keys(versions).length ? versions : null
}

async function post(origin, token, step, body, fetchImpl) {
  const response = await fetchImpl(`${origin}/api/ping/${encodeURIComponent(token)}/${step}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const reply = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`AssertChecks ${step} failed: HTTP ${response.status} ${reply.error ?? ''}`.trim())
  return reply
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function run(argv, { env = process.env, fetchImpl = fetch, out = console.log, log = console.error, sleep = wait } = {}) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      trigger: { type: 'string' },
      cases: { type: 'string' },
      version: { type: 'string', multiple: true },
      'test-sha': { type: 'string' },
      'run-id': { type: 'string' },
      'exit-code': { type: 'string' },
      playwright: { type: 'string' },
      catalog: { type: 'string' },
      error: { type: 'string' },
      ticket: { type: 'string' },
    },
  })
  const token = env.ASSERTCHECKS_PING_TOKEN
  if (!token) throw new Error('ASSERTCHECKS_PING_TOKEN is required')
  const origin = new URL(env.ASSERTCHECKS_ORIGIN ?? DEFAULT_ORIGIN).origin
  const runner = runnerFromEnv(env)
  const trigger = values.trigger ?? runner.trigger
  if (!['schedule', 'manual'].includes(trigger)) throw new Error('--trigger must be schedule or manual')
  const cases = values.cases ? values.cases.split(',').map((id) => id.trim()).filter(Boolean) : null
  const versions = () => readVersions(values.version ?? [], fetchImpl, log, sleep)
  const [command] = positionals

  if (command === 'start') {
    const reply = await post(origin, token, 'start', {
      testSha: testSha(values['test-sha'], env),
      runner: { kind: runner.kind, runUrl: runner.runUrl },
      trigger,
      cases,
      deployed: await versions(),
    }, fetchImpl)
    out(reply.runId)
    return 0
  }

  if (command === 'report') {
    const exitCode = Number(values['exit-code'])
    if (!Number.isInteger(exitCode)) throw new Error('--exit-code must be an integer')
    const base = {
      runId: values['run-id'] || null,
      exitCode,
      testSha: testSha(values['test-sha'], env),
      trigger,
      cases,
      deployedEnd: await versions(),
    }
    let error = values.error ?? null
    let result = null
    let catalog = null
    if (!error) {
      if (!values.playwright || !values.catalog) throw new Error('report needs --playwright and --catalog, or --error')
      if (!existsSync(values.playwright)) {
        error = `no Playwright report at ${values.playwright}`
      } else {
        const report = JSON.parse(readFileSync(values.playwright, 'utf8'))
        // The report is uploaded unchanged; AssertChecks parses it.
        result = { format: 'playwright', report }
        catalog = JSON.parse(readFileSync(values.catalog, 'utf8'))
        if (containsSensitive(JSON.stringify(report))) {
          error = 'credential-like content found in the report; it was not uploaded'
          result = null
        }
      }
    }
    const reply = await post(origin, token, 'report', error ? { ...base, error } : { ...base, result, catalog }, fetchImpl)
    out(`AssertChecks run ${reply.runId}: ${reply.outcome}`)
    for (const problem of reply.errors ?? []) log(`format error: ${problem}`)
    // A run that could not report its result, or reported it in the wrong format, is a failed job.
    return error || reply.errors?.length ? 1 : 0
  }

  if (command === 'check') {
    if (!values.catalog) throw new Error('check needs --catalog, and optionally --playwright')
    const body = { cases, catalog: JSON.parse(readFileSync(values.catalog, 'utf8')) }
    if (values.playwright) {
      const exitCode = values['exit-code'] === undefined ? 0 : Number(values['exit-code'])
      if (!Number.isInteger(exitCode)) throw new Error('--exit-code must be an integer')
      body.exitCode = exitCode
      body.result = { format: 'playwright', report: JSON.parse(readFileSync(values.playwright, 'utf8')) }
    }
    const reply = await post(origin, token, 'check', body, fetchImpl)
    if (!reply.valid) {
      for (const problem of reply.errors) log(`format error: ${problem}`)
      out('AssertChecks dry run: invalid; nothing was recorded')
      return 1
    }
    out(`AssertChecks dry run: valid${reply.outcome ? `, would be ${reply.outcome}${reply.reason ? ` (${reply.reason})` : ''}` : ''}; nothing was recorded`)
    return 0
  }

  if (command === 'link') {
    if (!cases?.length || !values.ticket) throw new Error('link needs --cases ID,ID and --ticket URL')
    const reply = await post(origin, token, 'link', { cases, ticket: values.ticket }, fetchImpl)
    out(`AssertChecks: ${values.ticket} linked to ${reply.linked.length ? reply.linked.join(', ') : 'no new cases'}` +
      `${reply.already.length ? `; already linked: ${reply.already.join(', ')}` : ''}`)
    return 0
  }

  throw new Error('usage: assertchecks.mjs start | report | check | link (see the header of this file)')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then(
    (code) => { process.exitCode = code },
    (error) => { console.error(error.message); process.exitCode = 1 },
  )
}
