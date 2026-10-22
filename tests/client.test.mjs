import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_ORIGIN, VERSION_RETRY_DELAYS_MS, run, runnerFromEnv } from '../public/client/assertchecks.mjs'

const SHA = 'a'.repeat(40)

// Records every request and answers like AssertChecks and a version endpoint would.
function fakeFetch(calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null })
    if (String(url).endsWith('/version.json')) return Response.json({ sha: SHA })
    if (String(url).endsWith('/broken')) return new Response('nope', { status: 500 })
    if (String(url).endsWith('/start')) return Response.json({ runId: '7' }, { status: 201 })
    return Response.json({ runId: '7', outcome: 'passed' })
  }
}

function harness(env = {}, fetchFor = fakeFetch) {
  const calls = []
  const lines = []
  const sleeps = []
  const warnings = []
  const options = {
    env: { ASSERTCHECKS_PING_TOKEN: 'secret-token', ...env },
    fetchImpl: fetchFor(calls),
    out: (line) => lines.push(String(line)),
    log: (line) => warnings.push(String(line)),
    sleep: async (ms) => { sleeps.push(ms) },
  }
  return { calls, lines, sleeps, warnings, options }
}

test('start sends trigger, runner, cases and versions and prints only the run ID', async () => {
  const { calls, lines, options } = harness()
  const code = await run(['start', '--trigger', 'schedule', '--cases', 'E2E-001,E2E-002', '--test-sha', 'b'.repeat(40),
    '--version', 'web=https://dev.example/version.json', '--version', 'api=https://dev.example/broken'], options)
  assert.equal(code, 0)
  assert.deepEqual(lines, ['7'])
  const start = calls.find((call) => call.url.endsWith('/start'))
  assert.equal(start.url, `${DEFAULT_ORIGIN}/api/ping/secret-token/start`)
  assert.deepEqual(start.body, {
    testSha: 'b'.repeat(40),
    runner: { kind: 'local', runUrl: null },
    trigger: 'schedule',
    cases: ['E2E-001', 'E2E-002'],
    deployed: { web: SHA, api: null },
  })
})

test('report uploads the Playwright report unchanged inside the envelope', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'assertchecks-client-'))
  const report = { suites: [], errors: [], stats: { expected: 1 } }
  writeFileSync(join(dir, 'results.json'), JSON.stringify(report))
  writeFileSync(join(dir, 'e2e.json'), JSON.stringify({ cases: [] }))
  const { calls, lines, options } = harness({ ASSERTCHECKS_ORIGIN: 'https://checks.example/' })
  const code = await run(['report', '--run-id', '7', '--exit-code', '0', '--test-sha', 'c'.repeat(40),
    '--playwright', join(dir, 'results.json'), '--catalog', join(dir, 'e2e.json')], options)
  assert.equal(code, 0)
  assert.deepEqual(lines, ['AssertChecks run 7: passed'])
  const sent = calls.find((call) => call.url.endsWith('/report'))
  assert.equal(sent.url, 'https://checks.example/api/ping/secret-token/report')
  assert.deepEqual(sent.body.result, { format: 'playwright', report })
  assert.deepEqual(sent.body.catalog, { cases: [] })
  assert.equal(sent.body.runId, '7')
})

test('a missing or credential-bearing report is reported as an error and fails the job', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'assertchecks-client-'))
  writeFileSync(join(dir, 'e2e.json'), JSON.stringify({ cases: [] }))
  writeFileSync(join(dir, 'leaky.json'), JSON.stringify({ suites: [], note: 'Bearer abc' }))
  for (const file of ['absent.json', 'leaky.json']) {
    const { calls, options } = harness()
    const code = await run(['report', '--run-id', '7', '--exit-code', '0',
      '--playwright', join(dir, file), '--catalog', join(dir, 'e2e.json')], options)
    assert.equal(code, 1)
    const sent = calls.find((call) => call.url.endsWith('/report')).body
    assert.equal(sent.result, undefined)
    assert.match(sent.error, file === 'absent.json' ? /no Playwright report/ : /credential-like/)
    assert.doesNotMatch(JSON.stringify(sent), /Bearer abc/)
  }
})

test('GitHub Actions supplies runner kind, run URL and trigger', () => {
  const env = {
    GITHUB_ACTIONS: 'true', GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '42', GITHUB_EVENT_NAME: 'schedule',
  }
  assert.deepEqual(runnerFromEnv(env), { kind: 'github-actions', runUrl: 'https://github.com/org/repo/actions/runs/42', trigger: 'schedule' })
  assert.equal(runnerFromEnv({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }).trigger, 'manual')
  assert.deepEqual(runnerFromEnv({}), { kind: 'local', runUrl: null, trigger: 'manual' })
})

test('a missing token fails before any request', async () => {
  const calls = []
  await assert.rejects(run(['start'], { env: {}, fetchImpl: fakeFetch(calls), out: () => {}, log: () => {} }), /ASSERTCHECKS_PING_TOKEN/)
  assert.equal(calls.length, 0)
})

// Fails the first `failures` version reads with a network error, then answers normally.
function flakyFetch(failures) {
  return (calls) => {
    const inner = fakeFetch(calls)
    let left = failures
    return async (url, init) => {
      if (String(url).endsWith('/version.json') && left > 0) {
        left -= 1
        calls.push({ url: String(url), body: null })
        throw new TypeError('fetch failed')
      }
      return inner(url, init)
    }
  }
}

test('a version read that fails twice is retried and recorded', async () => {
  const { calls, sleeps, warnings, options } = harness({}, flakyFetch(2))
  await run(['start', '--version', 'web=https://dev.example/version.json'], options)
  assert.equal(calls.filter((call) => call.url.endsWith('/version.json')).length, 3)
  assert.deepEqual(sleeps, VERSION_RETRY_DELAYS_MS)
  assert.deepEqual(calls.find((call) => call.url.endsWith('/start')).body.deployed, { web: SHA })
  assert.deepEqual(warnings, [])
})

test('a version read that keeps failing gives up after three attempts', async () => {
  const { calls, sleeps, warnings, options } = harness({}, flakyFetch(10))
  await run(['start', '--version', 'web=https://dev.example/version.json'], options)
  assert.equal(calls.filter((call) => call.url.endsWith('/version.json')).length, 3)
  assert.deepEqual(sleeps, [2000, 4000])
  assert.deepEqual(calls.find((call) => call.url.endsWith('/start')).body.deployed, { web: null })
  assert.match(warnings[0], /web version after 3 attempts/)
})

test('check sends the catalog and result for a dry run and reports validity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'assertchecks-client-'))
  writeFileSync(join(dir, 'results.json'), JSON.stringify({ suites: [] }))
  writeFileSync(join(dir, 'e2e.json'), JSON.stringify({ version: 1, cases: [] }))
  const answers = (calls) => async (url, init = {}) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    return Response.json({ valid: true, outcome: 'passed', reason: null })
  }
  const { calls, lines, options } = harness({}, answers)
  const code = await run(['check', '--catalog', join(dir, 'e2e.json'), '--playwright', join(dir, 'results.json'), '--exit-code', '1'], options)
  assert.equal(code, 0)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${DEFAULT_ORIGIN}/api/ping/secret-token/check`)
  assert.deepEqual(calls[0].body, { cases: null, catalog: { version: 1, cases: [] }, exitCode: 1, result: { format: 'playwright', report: { suites: [] } } })
  assert.deepEqual(lines, ['AssertChecks dry run: valid, would be passed; nothing was recorded'])
})

test('check exits non-zero and lists the fields when the format is wrong', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'assertchecks-client-'))
  writeFileSync(join(dir, 'e2e.json'), JSON.stringify({ cases: [] }))
  const answers = (calls) => async (url, init = {}) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    return Response.json({ valid: false, errors: ['catalog: missing version'] })
  }
  const { calls, lines, warnings, options } = harness({}, answers)
  const code = await run(['check', '--catalog', join(dir, 'e2e.json')], options)
  assert.equal(code, 1)
  assert.deepEqual(calls[0].body, { cases: null, catalog: { cases: [] } })
  assert.deepEqual(warnings, ['format error: catalog: missing version'])
  assert.deepEqual(lines, ['AssertChecks dry run: invalid; nothing was recorded'])
})

test('report exits non-zero when AssertChecks names format errors', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'assertchecks-client-'))
  writeFileSync(join(dir, 'results.json'), JSON.stringify({ suites: [] }))
  writeFileSync(join(dir, 'e2e.json'), JSON.stringify({ cases: [] }))
  const answers = () => async () => Response.json({ runId: '8', outcome: 'incomplete', errors: ['catalog: missing version'] })
  const { lines, warnings, options } = harness({}, answers)
  const code = await run(['report', '--run-id', '8', '--exit-code', '0', '--playwright', join(dir, 'results.json'), '--catalog', join(dir, 'e2e.json')], options)
  assert.equal(code, 1)
  assert.deepEqual(lines, ['AssertChecks run 8: incomplete'])
  assert.deepEqual(warnings, ['format error: catalog: missing version'])
})

// A person signed in on this computer: a configuration directory of its own with a saved token.
function signedIn(project) {
  const config = mkdtempSync(join(tmpdir(), 'assertchecks-config-'))
  const repo = mkdtempSync(join(tmpdir(), 'assertchecks-repo-'))
  mkdirSync(join(config, 'assertchecks'))
  writeFileSync(join(config, 'assertchecks', 'credentials.json'), JSON.stringify({ [DEFAULT_ORIGIN]: { token: 'person-token', email: 'a@example.com' } }))
  if (project) {
    mkdirSync(join(repo, 'assertchecks'))
    writeFileSync(join(repo, 'assertchecks', 'config.json'), JSON.stringify({ project }))
  }
  return { config, repo }
}

test('link sends the configured project, the cases and the ticket as the signed-in person', async () => {
  const { config, repo } = signedIn('shop')
  const answers = (calls) => async (url, init = {}) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), authorization: init.headers.authorization })
    return Response.json({ linked: ['E2E-094'], already: ['E2E-151'] })
  }
  const { calls, lines, options } = harness({ ASSERTCHECKS_PING_TOKEN: '', XDG_CONFIG_HOME: config }, answers)
  const code = await run(['link', '--cases', 'E2E-094,E2E-151', '--ticket', 'https://linear.app/x/issue/ENG-1'], { ...options, cwd: repo })
  assert.equal(code, 0)
  assert.equal(calls[0].url, `${DEFAULT_ORIGIN}/api/cli/link`)
  assert.equal(calls[0].authorization, 'Bearer person-token')
  assert.deepEqual(calls[0].body, { project: 'shop', cases: ['E2E-094', 'E2E-151'], ticket: 'https://linear.app/x/issue/ENG-1' })
  assert.deepEqual(lines, ['AssertChecks: https://linear.app/x/issue/ENG-1 linked to E2E-094; already linked: E2E-151'])
})

test('link needs a signed-in person, cases and a ticket', async () => {
  const { config, repo } = signedIn('shop')
  const { options } = harness({ XDG_CONFIG_HOME: config })
  await assert.rejects(run(['link', '--cases', 'E2E-094'], { ...options, cwd: repo }), /--ticket/)
  const away = harness({ XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'assertchecks-config-')) })
  await assert.rejects(run(['link', '--cases', 'E2E-094', '--ticket', 'https://x.example/1'], { ...away.options, cwd: repo }), /not signed in/)
})

test('bugs without a project lists the person\'s projects and fails', async () => {
  const { config, repo } = signedIn(null)
  const answers = (calls) => async (url) => {
    calls.push({ url: String(url) })
    return Response.json({ projects: [{ slug: 'shop', name: 'Shop' }] })
  }
  const { calls, lines, options } = harness({ XDG_CONFIG_HOME: config }, answers)
  assert.equal(await run(['bugs', '--check', 'dev'], { ...options, cwd: repo }), 1)
  assert.equal(calls[0].url, `${DEFAULT_ORIGIN}/api/cli/bugs?`)
  assert.deepEqual(lines.slice(1), ['- shop: Shop'])
})

test('login saves the token before approval, privately, and never prints it', async () => {
  const config = mkdtempSync(join(tmpdir(), 'assertchecks-config-'))
  const answers = (calls) => async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : null, authorization: init.headers?.authorization })
    if (init.method === 'POST') return Response.json({ code: 'ABCD-EFGH', url: `${DEFAULT_ORIGIN}/cli/ABCD-EFGH`, minutes: 10 })
    const polls = calls.filter((call) => call.method === 'GET').length
    return polls < 2
      ? Response.json({ error: 'sign-in is waiting for approval', url: `${DEFAULT_ORIGIN}/cli/ABCD-EFGH` }, { status: 401 })
      : Response.json({ email: 'a@example.com' })
  }
  const { calls, lines, options } = harness({ ASSERTCHECKS_PING_TOKEN: '', XDG_CONFIG_HOME: config }, answers)
  assert.equal(await run(['login'], options), 0)
  const file = join(config, 'assertchecks', 'credentials.json')
  const saved = JSON.parse(readFileSync(file, 'utf8'))[DEFAULT_ORIGIN]
  assert.equal(statSync(file).mode & 0o777, 0o600)
  assert.equal(calls[0].body.tokenHash, createHash('sha256').update(saved.token).digest('hex'))
  assert.equal(calls[1].authorization, `Bearer ${saved.token}`)
  assert.equal(saved.email, 'a@example.com')
  assert.ok(lines.every((line) => !line.includes(saved.token)))
  assert.deepEqual(lines, [
    `Open ${DEFAULT_ORIGIN}/cli/ABCD-EFGH and approve code ABCD-EFGH with your AssertChecks account. Waiting for approval...`,
    `Signed in to ${DEFAULT_ORIGIN} as a@example.com`,
  ])
})
