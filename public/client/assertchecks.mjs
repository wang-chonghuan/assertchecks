#!/usr/bin/env node
// AssertChecks client: report test runs to AssertChecks, and read failures and link tickets as a person.
// Zero dependencies, Node 20+. Served by AssertChecks at /client/assertchecks.mjs so it always matches
// the server.
//
// A check's runs, with its ping token in ASSERTCHECKS_PING_TOKEN (never printed):
//   node assertchecks.mjs start  [--trigger schedule|manual] [--cases ID,ID] [--version NAME=URL]...
//   node assertchecks.mjs report --run-id ID --exit-code N --playwright results.json --catalog e2e.json
//                                [--version NAME=URL]...
//   node assertchecks.mjs report --run-id ID --exit-code N --error "why there is no report"
//   node assertchecks.mjs check  --catalog e2e.json [--playwright results.json --exit-code N] [--cases ID,ID]
//
// A person, after signing in once on this computer:
//   node assertchecks.mjs login
//   node assertchecks.mjs bugs   [--project SLUG] [--check SLUG]
//   node assertchecks.mjs link   [--project SLUG] --cases ID,ID --ticket URL
//   node assertchecks.mjs logout
//
// `check` is a dry run: it validates the catalog (and the result, when given) against the published
// formats at /schemas/ and shows how the check would judge it, without recording a run.
// `login` prints an address where the person approves this computer with their AssertChecks account;
// the token stays in their own configuration directory (credentials.json under $XDG_CONFIG_HOME or
// ~/.config/assertchecks), never in the repository and never printed. If the command is stopped before
// the approval, approving still signs the computer in. `bugs` prints a check's failure report, the same
// text as "Copy bugs from recent runs"; without a project or check it lists the choices. `link` records
// that a ticket covers these cases, which must be in the project's current catalogs. The project comes
// from --project or from "project" in assertchecks/config.json in the current directory.
//
// Environment: ASSERTCHECKS_PING_TOKEN (for start, report, check), ASSERTCHECKS_ORIGIN (optional).
// `start` prints only the run ID. A version URL must return JSON with a 40-character `sha`; each read
// is tried up to three times (waiting 2 s, then 4 s) before it is recorded as unreadable.
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
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

// The person's sign-ins, one per AssertChecks origin, in their own configuration directory.
export function credentialsPath(env) {
  return join(env.XDG_CONFIG_HOME || join(env.HOME || homedir(), '.config'), 'assertchecks', 'credentials.json')
}

function readCredentials(env) {
  const file = credentialsPath(env)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

function writeCredentials(env, all) {
  const file = credentialsPath(env)
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 })
  chmodSync(file, 0o600)
}

// The project named on the command line or in the repository's assertchecks/config.json.
export function projectOf(given, cwd) {
  if (given) return given
  const file = join(cwd, 'assertchecks', 'config.json')
  if (!existsSync(file)) return null
  const project = JSON.parse(readFileSync(file, 'utf8')).project
  return typeof project === 'string' && project ? project : null
}

async function asPerson(origin, token, method, path, body, fetchImpl) {
  return fetchImpl(`${origin}/api/cli/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

// The reply of a signed-in call, or the reason the person has to sign in (again).
async function personReply(response, what) {
  if (response.status === 401) {
    const reply = await response.json().catch(() => ({}))
    throw new Error(reply.url
      ? `Sign-in is waiting for approval: open ${reply.url}`
      : 'AssertChecks does not accept this computer\'s sign-in (signed out, revoked or expired). Run: node assertchecks.mjs login')
  }
  if (response.status === 404) throw new Error(`AssertChecks: ${what} not found among your projects`)
  const plain = response.headers.get('content-type')?.startsWith('text/plain')
  const reply = plain ? await response.text() : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`AssertChecks: ${reply.error ?? `HTTP ${response.status}`}`)
  return reply
}

// Waits while AssertChecks says the sign-in awaits approval; it voids the request after its time limit.
async function awaitApproval({ origin, env, token, url, fetchImpl, out, sleep }) {
  out(`Open ${url} and approve code ${url.split('/').pop()} with your AssertChecks account. Waiting for approval...`)
  for (;;) {
    await sleep(2_000)
    const response = await asPerson(origin, token, 'GET', 'session', null, fetchImpl)
    const reply = await response.json().catch(() => ({}))
    if (response.ok) {
      const all = readCredentials(env)
      all[origin] = { token, email: reply.email }
      writeCredentials(env, all)
      out(`Signed in to ${origin} as ${reply.email}`)
      return 0
    }
    if (response.status !== 401 || !reply.url) {
      const all = readCredentials(env)
      if (all[origin]?.token === token) { delete all[origin]; writeCredentials(env, all) }
      throw new Error(response.status === 401 ? 'The sign-in request expired. Run login again.' : `AssertChecks login failed: HTTP ${response.status}`)
    }
  }
}

const PING_COMMANDS = ['start', 'report', 'check']

export async function run(argv, { env = process.env, fetchImpl = fetch, out = console.log, log = console.error, sleep = wait, cwd = process.cwd() } = {}) {
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
      project: { type: 'string' },
      check: { type: 'string' },
    },
  })
  const origin = new URL(env.ASSERTCHECKS_ORIGIN ?? DEFAULT_ORIGIN).origin
  const runner = runnerFromEnv(env)
  const trigger = values.trigger ?? runner.trigger
  if (!['schedule', 'manual'].includes(trigger)) throw new Error('--trigger must be schedule or manual')
  const cases = values.cases ? values.cases.split(',').map((id) => id.trim()).filter(Boolean) : null
  const versions = () => readVersions(values.version ?? [], fetchImpl, log, sleep)
  const [command] = positionals
  const token = env.ASSERTCHECKS_PING_TOKEN
  if (PING_COMMANDS.includes(command) && !token) throw new Error('ASSERTCHECKS_PING_TOKEN is required')

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

  if (command === 'login') {
    const saved = readCredentials(env)[origin]
    if (saved) {
      const response = await asPerson(origin, saved.token, 'GET', 'session', null, fetchImpl)
      const reply = await response.json().catch(() => ({}))
      if (response.ok) {
        out(`Signed in to ${origin} as ${reply.email}`)
        return 0
      }
      // A login stopped before its approval resumes with the same address.
      if (response.status === 401 && reply.url) return awaitApproval({ origin, env, token: saved.token, url: reply.url, fetchImpl, out, sleep })
    }
    const personal = randomBytes(32).toString('base64url')
    const response = await fetchImpl(`${origin}/api/cli/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tokenHash: createHash('sha256').update(personal).digest('hex') }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const reply = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`AssertChecks login failed: HTTP ${response.status} ${reply.error ?? ''}`.trim())
    // Saved before the approval, so approving signs this computer in even if this command is stopped.
    const all = readCredentials(env)
    all[origin] = { token: personal, email: null }
    writeCredentials(env, all)
    return awaitApproval({ origin, env, token: personal, url: reply.url, fetchImpl, out, sleep })
  }

  if (command === 'logout') {
    const all = readCredentials(env)
    if (!all[origin]) {
      out(`Not signed in to ${origin}`)
      return 0
    }
    const response = await asPerson(origin, all[origin].token, 'DELETE', 'session', null, fetchImpl)
    if (!response.ok && response.status !== 401) throw new Error(`AssertChecks logout failed: HTTP ${response.status}; still signed in`)
    delete all[origin]
    writeCredentials(env, all)
    out(`Signed out of ${origin}`)
    return 0
  }

  if (command === 'bugs' || command === 'link') {
    const saved = readCredentials(env)[origin]
    if (!saved) throw new Error(`Not signed in to ${origin}. Run: node assertchecks.mjs login`)
    const project = projectOf(values.project, cwd)

    if (command === 'link') {
      if (!project) throw new Error('link needs --project SLUG, or "project" in assertchecks/config.json')
      if (!cases?.length || !values.ticket) throw new Error('link needs --cases ID,ID and --ticket URL')
      const reply = await personReply(await asPerson(origin, saved.token, 'POST', 'link', { project, cases, ticket: values.ticket }, fetchImpl), `project ${project}`)
      out(`AssertChecks: ${values.ticket} linked to ${reply.linked.length ? reply.linked.join(', ') : 'no new cases'}` +
        `${reply.already.length ? `; already linked: ${reply.already.join(', ')}` : ''}`)
      return 0
    }

    const query = new URLSearchParams()
    if (project) query.set('project', project)
    if (project && values.check) query.set('check', values.check)
    const reply = await personReply(await asPerson(origin, saved.token, 'GET', `bugs?${query}`, null, fetchImpl),
      project && values.check ? `check ${project}/${values.check}` : `project ${project}`)
    if (typeof reply === 'string') {
      out(reply)
      return 0
    }
    if (reply.projects) {
      out('Name the project with --project SLUG, or set "project" in assertchecks/config.json. Your projects:')
      for (const item of reply.projects) out(`- ${item.slug}: ${item.name}`)
    } else {
      out(`Name the check with --check SLUG. Checks of ${project}:`)
      for (const item of reply.checks) out(`- ${item.slug}: ${item.name} (environment ${item.environment})`)
    }
    return 1
  }

  throw new Error('usage: assertchecks.mjs start | report | check | login | bugs | link | logout (see the header of this file)')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then(
    (code) => { process.exitCode = code },
    (error) => { console.error(error.message); process.exitCode = 1 },
  )
}
