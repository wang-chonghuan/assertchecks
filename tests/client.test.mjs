import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_ORIGIN, run, runnerFromEnv } from '../public/client/assertchecks.mjs'

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

function harness(env = {}) {
  const calls = []
  const lines = []
  const options = {
    env: { ASSERTCHECKS_PING_TOKEN: 'secret-token', ...env },
    fetchImpl: fakeFetch(calls),
    out: (line) => lines.push(String(line)),
    log: () => {},
  }
  return { calls, lines, options }
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
